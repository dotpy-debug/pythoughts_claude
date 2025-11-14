/**
 * AI-Powered Error Reporting System
 * Generates structured error reports for automated analysis and fixing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import {
  getCurrentBranch,
  getCurrentCommit,
  getCommitAuthor,
  getCommitAuthorEmail,
  getChangedFiles,
  getRemoteUrl,
} from './git-helper.js';
import type {
  ErrorReport,
  ErrorDiagnostic,
  PipelineStage,
  GitContext,
  EnvironmentContext,
} from '../types/error-report.js';

/**
 * Create a structured error report
 */
export function createErrorReport(
  stage: PipelineStage,
  diagnostics: ErrorDiagnostic[],
  command?: string,
  exitCode?: number
): ErrorReport {
  const id = generateReportId();
  const timestamp = new Date().toISOString();

  // Gather git context
  const gitContext: GitContext = {
    branch: getCurrentBranch(),
    commit: getCurrentCommit(),
    author: `${getCommitAuthor()} <${getCommitAuthorEmail()}>`,
    changedFiles: getChangedFiles(),
    remote: getRemoteUrl(),
  };

  // Gather environment context
  const environment: EnvironmentContext = {
    os: `${os.platform()} ${os.release()}`,
    nodeVersion: process.version,
    npmVersion: getNpmVersion(),
    tsVersion: getTypeScriptVersion(),
    isCI: isCI(),
    ciProvider: getCIProvider(),
    cwd: process.cwd(),
  };

  // Generate reproduction steps
  const howToReproduce = generateReproductionSteps(stage, command);

  return {
    id,
    timestamp,
    stage,
    diagnostics,
    gitContext,
    environment,
    command,
    exitCode,
    howToReproduce,
  };
}

/**
 * Emit error report to console and optionally save to file
 */
export function emitErrorReport(report: ErrorReport): void {
  const delimiter = '='.repeat(80);

  console.error(`\n${delimiter}`);
  console.error('🤖 AI ERROR REPORT');
  console.error(`${delimiter}\n`);

  console.error(`Report ID: ${report.id}`);
  console.error(`Stage: ${report.stage}`);
  console.error(`Timestamp: ${report.timestamp}`);
  console.error(`Branch: ${report.gitContext.branch}`);
  console.error(`Commit: ${report.gitContext.commit.substring(0, 8)}`);
  console.error(`\nDiagnostics (${report.diagnostics.length}):\n`);

  for (const diagnostic of report.diagnostics) {
    console.error(`  [${diagnostic.severity.toUpperCase()}] ${diagnostic.category}`);
    console.error(`  ${diagnostic.message}`);
    if (diagnostic.file) {
      const location = `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ''}${
        diagnostic.column ? `:${diagnostic.column}` : ''
      }`;
      console.error(`  📍 ${location}`);
    }
    if (diagnostic.ruleId) {
      console.error(`  Rule: ${diagnostic.ruleId}`);
    }
    if (diagnostic.suggestedFix) {
      console.error(`  💡 ${diagnostic.suggestedFix}`);
    }
    console.error('');
  }

  console.error('How to Reproduce:');
  for (const step of report.howToReproduce) {
    console.error(`  ${step}`);
  }

  console.error(`\n${delimiter}`);
  console.error('JSON Report (for AI processing):');
  console.error(`${delimiter}\n`);
  console.error(JSON.stringify(report, null, 2));
  console.error(`\n${delimiter}\n`);

  // Save to file in CI or if reports directory exists
  if (report.environment.isCI || fs.existsSync('.githooks/reports')) {
    saveReportToFile(report);
  }
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ERR-${timestamp}-${random}`;
}

/**
 * Get npm version
 */
function getNpmVersion(): string {
  try {
    return execSync('npm --version', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get TypeScript version
 */
function getTypeScriptVersion(): string | undefined {
  try {
    return execSync('npx tsc --version', { encoding: 'utf-8' })
      .trim()
      .replace('Version ', '');
  } catch {
    return undefined;
  }
}

/**
 * Check if running in CI
 */
function isCI(): boolean {
  return process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;
}

/**
 * Get CI provider name
 */
function getCIProvider(): string | undefined {
  if (process.env.GITHUB_ACTIONS) return 'GitHub Actions';
  if (process.env.GITLAB_CI) return 'GitLab CI';
  if (process.env.CIRCLECI) return 'CircleCI';
  if (process.env.TRAVIS) return 'Travis CI';
  if (process.env.JENKINS_URL) return 'Jenkins';
  return undefined;
}

/**
 * Generate reproduction steps
 */
function generateReproductionSteps(
  stage: PipelineStage,
  command?: string
): string[] {
  const steps: string[] = [];

  steps.push(`git checkout ${getCurrentBranch()}`);
  steps.push('npm install');

  if (command) {
    steps.push(command);
  } else {
    switch (stage) {
      case 'pre-commit':
        steps.push('git add <files>');
        steps.push('git commit');
        break;
      case 'pre-push':
        steps.push('git push');
        break;
      case 'ci':
        steps.push('Run CI pipeline');
        break;
    }
  }

  return steps;
}

/**
 * Save report to file
 */
function saveReportToFile(report: ErrorReport): void {
  try {
    const reportsDir = path.join(process.cwd(), '.githooks/reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${report.id}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    console.error(`📁 Report saved: ${filepath}`);

    // In CI, also write to GITHUB_STEP_SUMMARY if available
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendToGitHubSummary(report);
    }
  } catch (error) {
    console.error('Warning: Could not save error report to file');
  }
}

/**
 * Append error report to GitHub Actions step summary
 */
function appendToGitHubSummary(report: ErrorReport): void {
  try {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile) return;

    const markdown = `
## ❌ Error Report: ${report.id}

**Stage:** ${report.stage}
**Branch:** ${report.gitContext.branch}
**Commit:** \`${report.gitContext.commit.substring(0, 8)}\`

### Diagnostics

${report.diagnostics
  .map(
    (d) => `
- **[${d.severity.toUpperCase()}]** ${d.category}
  - ${d.message}
  ${d.file ? `- 📍 \`${d.file}:${d.line || '?'}\`` : ''}
  ${d.suggestedFix ? `- 💡 ${d.suggestedFix}` : ''}
`
  )
  .join('\n')}

### How to Reproduce

\`\`\`bash
${report.howToReproduce.join('\n')}
\`\`\`

---
`;

    fs.appendFileSync(summaryFile, markdown);
  } catch (error) {
    // Silently fail if we can't write to summary
  }
}
