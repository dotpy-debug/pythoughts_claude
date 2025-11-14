#!/usr/bin/env tsx
/**
 * Enhanced Pre-Push Hook
 * Analyzes changes and runs smart tests before pushing
 */

import chalk from 'chalk';
import { analyzeChanges } from './analyze-changes.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const START_TIME = Date.now();

/**
 * Main pre-push check function
 */
async function runPrePushChecks(): Promise<void> {
  console.log(chalk.cyan.bold('\n🚀 Running pre-push checks...\n'));

  // Step 1: Analyze what changed
  console.log(chalk.blue('📊 Analyzing changes...'));
  const analysis = await analyzeChanges();

  // Display change summary
  displayChangeSummary(analysis);

  // Step 2: Run appropriate tests based on analysis
  if (analysis.buildScope === 'none') {
    console.log(chalk.green('\n✅ Documentation-only changes detected.'));
    console.log(chalk.gray('   Skipping all tests. Safe to push!\n'));
    process.exit(0);
  }

  let hasErrors = false;

  // Always run unit tests for code changes
  if (analysis.testSuitesToRun.includes('unit')) {
    console.log(chalk.blue('\n🧪 Running unit tests...'));
    try {
      execSync('npm run test:unit', { stdio: 'inherit' });
      console.log(chalk.green('  ✓ Unit tests passed'));
    } catch (error) {
      console.log(chalk.red('  ✗ Unit tests failed'));
      hasErrors = true;
    }
  }

  // Conditional database tests
  if (!analysis.skipDatabase && analysis.testSuitesToRun.includes('database')) {
    console.log(chalk.blue('\n🗄️  Running database tests...'));
    console.log(chalk.gray('  (Database changes detected)'));
    try {
      execSync('npm run test:integration', { stdio: 'inherit' });
      console.log(chalk.green('  ✓ Database tests passed'));
    } catch (error) {
      console.log(chalk.red('  ✗ Database tests failed'));
      hasErrors = true;
    }
  } else {
    console.log(chalk.gray('\n⏭️  Skipping database tests (no DB changes detected)'));
  }

  // Save CI metadata for GitHub Actions
  saveCIMetadata(analysis);

  const elapsed = Date.now() - START_TIME;

  if (hasErrors) {
    console.log(chalk.red.bold('\n❌ Pre-push checks failed!'));
    console.log(chalk.yellow('\n💡 Fix the failing tests before pushing.'));
    console.log(chalk.gray(`   Or use: git push --no-verify to bypass (not recommended)\n`));
    process.exit(1);
  }

  // Display optimization summary
  displayOptimizationSummary(analysis, elapsed);

  console.log(chalk.green.bold('\n✅ All pre-push checks passed!'));
  console.log(chalk.gray(`   Completed in ${(elapsed / 1000).toFixed(2)}s`));
  console.log(chalk.green('   Safe to push! 🚀\n'));
}

/**
 * Display change summary
 */
function displayChangeSummary(analysis: any): void {
  console.log(chalk.cyan('\n📋 Change Summary:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Build Scope:     ${getBuildScopeEmoji(analysis.buildScope)} ${analysis.buildScope}`);
  console.log(`  Files Changed:   ${analysis.filesChanged}`);
  console.log(`  Branch:          ${analysis.currentBranch}`);
  console.log(`  Base Branch:     ${analysis.baseBranch}`);

  if (analysis.reasoning && analysis.reasoning.length > 0) {
    console.log(chalk.gray('\n  Reasoning:'));
    for (const reason of analysis.reasoning) {
      console.log(chalk.gray(`    • ${reason}`));
    }
  }
  console.log(chalk.gray('─'.repeat(50)));
}

/**
 * Display optimization summary
 */
function displayOptimizationSummary(analysis: any, localTime: number): void {
  if (analysis.estimatedTimeSaved > 0 || analysis.estimatedCostSaved > 0) {
    console.log(chalk.cyan('\n💰 CI/CD Optimizations:'));
    console.log(chalk.gray('─'.repeat(50)));

    if (analysis.estimatedTimeSaved > 0) {
      console.log(
        `  ⏱️  Estimated Time Saved:  ~${analysis.estimatedTimeSaved}s`
      );
    }

    if (analysis.estimatedCostSaved > 0) {
      console.log(
        `  💵 Estimated Cost Saved:  ~${analysis.estimatedCostSaved}%`
      );
    }

    console.log(chalk.gray('\n  Skipped in CI:'));
    if (analysis.skipDatabase) console.log(chalk.gray('    • Database tests'));
    if (analysis.skipRedis) console.log(chalk.gray('    • Redis/cache tests'));
    if (analysis.skipIntegration) console.log(chalk.gray('    • Integration tests'));
    if (analysis.skipE2E) console.log(chalk.gray('    • E2E tests'));

    console.log(chalk.gray('─'.repeat(50)));
  }
}

/**
 * Get emoji for build scope
 */
function getBuildScopeEmoji(scope: string): string {
  switch (scope) {
    case 'none':
      return '📝';
    case 'minimal':
      return '⚡';
    case 'partial':
      return '🔨';
    case 'full':
      return '🏗️';
    default:
      return '❓';
  }
}

/**
 * Save CI metadata for GitHub Actions to use
 */
function saveCIMetadata(analysis: any): void {
  const metadata = {
    buildScope: analysis.buildScope,
    skipDatabase: analysis.skipDatabase,
    skipRedis: analysis.skipRedis,
    skipIntegration: analysis.skipIntegration,
    skipE2E: analysis.skipE2E,
    filesChanged: analysis.filesChanged,
    estimatedTimeSaved: analysis.estimatedTimeSaved,
    estimatedCostSaved: analysis.estimatedCostSaved,
  };

  // Save to file for CI to pick up
  const metadataPath = path.join(process.cwd(), '.githooks/.cache/ci-metadata.json');
  const cacheDir = path.dirname(metadataPath);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // If in CI, write to GITHUB_OUTPUT
  if (process.env.GITHUB_OUTPUT) {
    const output = [
      `build_scope=${analysis.buildScope}`,
      `skip_database=${analysis.skipDatabase}`,
      `skip_redis=${analysis.skipRedis}`,
      `skip_integration=${analysis.skipIntegration}`,
      `skip_e2e=${analysis.skipE2E}`,
    ].join('\n');

    fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
  }
}

// Run the checks
runPrePushChecks().catch((error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message);
  process.exit(1);
});
