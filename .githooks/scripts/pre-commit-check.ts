#!/usr/bin/env tsx
/**
 * Enhanced Pre-Commit Hook
 * Runs linting, type checking, and syntax validation with AI error reporting
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { getStagedFiles } from './utils/git-helper.js';
import { createErrorReport, emitErrorReport } from './utils/error-reporter.js';
import type { ErrorDiagnostic } from '../types/error-report.js';

const START_TIME = Date.now();

/**
 * Main pre-commit check function
 */
async function runPreCommitChecks(): Promise<void> {
  console.log(chalk.cyan.bold('\n🔍 Running pre-commit checks...\n'));

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log(chalk.yellow('No staged files to check.'));
    process.exit(0);
  }

  console.log(chalk.gray(`Checking ${stagedFiles.length} staged files...`));

  const diagnostics: ErrorDiagnostic[] = [];
  let hasErrors = false;

  // Run checks in parallel
  const checks = [
    runLintCheck(stagedFiles, diagnostics),
    runTypeCheck(diagnostics),
    runSecretScan(stagedFiles, diagnostics),
  ];

  const results = await Promise.allSettled(checks);

  // Check if any check failed
  for (const result of results) {
    if (result.status === 'rejected') {
      hasErrors = true;
    }
  }

  const elapsed = Date.now() - START_TIME;

  if (hasErrors || diagnostics.length > 0) {
    console.log(chalk.red.bold('\n❌ Pre-commit checks failed!\n'));

    // Emit AI error report
    const errorReport = createErrorReport('pre-commit', diagnostics, 'git commit');
    emitErrorReport(errorReport);

    console.log(chalk.yellow('\n💡 Tip: Fix the issues above and try again.'));
    console.log(chalk.gray(`   Or use: git commit --no-verify to bypass (not recommended)\n`));

    process.exit(1);
  }

  console.log(chalk.green.bold('\n✅ All pre-commit checks passed!'));
  console.log(chalk.gray(`   Completed in ${(elapsed / 1000).toFixed(2)}s\n`));
}

/**
 * Run ESLint on staged files
 */
async function runLintCheck(
  stagedFiles: string[],
  diagnostics: ErrorDiagnostic[]
): Promise<void> {
  const codeFiles = stagedFiles.filter((f) =>
    /\.(ts|tsx|js|jsx)$/.test(f)
  );

  if (codeFiles.length === 0) {
    console.log(chalk.gray('  ↪ Lint: No code files to check'));
    return;
  }

  console.log(chalk.blue('  ↪ Running ESLint...'));

  try {
    execSync(`npx eslint ${codeFiles.join(' ')} --max-warnings 0`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log(chalk.green('    ✓ Lint passed'));
  } catch (error: any) {
    // Parse ESLint output
    const output = error.stdout || error.stderr || '';
    parseLintErrors(output, diagnostics);
    console.log(chalk.red('    ✗ Lint failed'));
    throw error;
  }
}

/**
 * Run TypeScript type checking
 */
async function runTypeCheck(diagnostics: ErrorDiagnostic[]): Promise<void> {
  console.log(chalk.blue('  ↪ Running TypeScript type check...'));

  try {
    execSync('npm run typecheck', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log(chalk.green('    ✓ Type check passed'));
  } catch (error: any) {
    const output = error.stdout || error.stderr || '';
    parseTypeErrors(output, diagnostics);
    console.log(chalk.red('    ✗ Type check failed'));
    throw error;
  }
}

/**
 * Scan for secrets in staged files
 */
async function runSecretScan(
  stagedFiles: string[],
  diagnostics: ErrorDiagnostic[]
): Promise<void> {
  console.log(chalk.blue('  ↪ Scanning for secrets...'));

  const secretPatterns = [
    { pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]{20,})['"]/i, name: 'API Key' },
    { pattern: /-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----/, name: 'Private Key' },
    { pattern: /(password|passwd)\s*[:=]\s*['"]([^'"]+)['"]/i, name: 'Password' },
  ];

  let foundSecrets = false;

  for (const file of stagedFiles) {
    const filePath = path.join(process.cwd(), file);

    if (!fs.existsSync(filePath)) continue;

    // Skip binary files
    if (/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz)$/.test(file)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(content)) {
          foundSecrets = true;
          diagnostics.push({
            message: `Possible ${name} detected`,
            file,
            severity: 'critical',
            category: 'security',
            suggestedFix: `Remove the ${name} and use environment variables instead`,
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  if (foundSecrets) {
    console.log(chalk.red('    ✗ Secret scan found issues'));
    throw new Error('Secrets detected');
  } else {
    console.log(chalk.green('    ✓ Secret scan passed'));
  }
}

/**
 * Parse ESLint errors into diagnostics
 */
function parseLintErrors(output: string, diagnostics: ErrorDiagnostic[]): void {
  // Simple parsing - you can enhance this
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/(.+?):(\d+):(\d+):\s+(error|warning)\s+(.+?)\s+(.+)/);
    if (match) {
      const [, file, lineNum, colNum, severity, message, ruleId] = match;
      diagnostics.push({
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        severity: severity === 'error' ? 'error' : 'warning',
        category: 'lint',
        message,
        ruleId,
      });
    }
  }
}

/**
 * Parse TypeScript errors into diagnostics
 */
function parseTypeErrors(output: string, diagnostics: ErrorDiagnostic[]): void {
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/(.+?)\((\d+),(\d+)\):\s+error\s+(.+?):\s+(.+)/);
    if (match) {
      const [, file, lineNum, colNum, code, message] = match;
      diagnostics.push({
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        severity: 'error',
        category: 'type',
        message,
        ruleId: code,
      });
    }
  }
}

// Run the checks
runPreCommitChecks().catch((error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message);
  process.exit(1);
});
