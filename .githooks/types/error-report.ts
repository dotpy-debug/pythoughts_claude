/**
 * Type definitions for AI-powered error reporting system
 * These types enable automated error analysis and fix proposals
 */

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export type ErrorCategory =
  | 'lint'
  | 'type'
  | 'syntax'
  | 'test'
  | 'security'
  | 'build'
  | 'runtime';

export type PipelineStage = 'pre-commit' | 'pre-push' | 'ci' | 'post-merge';

export interface ErrorDiagnostic {
  /** Specific error message */
  message: string;

  /** File path where error occurred */
  file?: string;

  /** Line number */
  line?: number;

  /** Column number */
  column?: number;

  /** Error severity level */
  severity: ErrorSeverity;

  /** Error category for classification */
  category: ErrorCategory;

  /** Full error stack trace if available */
  stack?: string;

  /** Suggested fix (if available) */
  suggestedFix?: string;

  /** Rule ID (e.g., ESLint rule name) */
  ruleId?: string;
}

export interface GitContext {
  /** Current branch name */
  branch: string;

  /** Latest commit SHA */
  commit: string;

  /** Commit author */
  author: string;

  /** List of changed files */
  changedFiles: string[];

  /** Base branch (main/master/develop) */
  baseBranch?: string;

  /** Remote repository URL */
  remote?: string;
}

export interface EnvironmentContext {
  /** Operating system */
  os: string;

  /** Node.js version */
  nodeVersion: string;

  /** npm version */
  npmVersion: string;

  /** TypeScript version */
  tsVersion?: string;

  /** Is running in CI environment */
  isCI: boolean;

  /** CI provider name (GitHub Actions, etc.) */
  ciProvider?: string;

  /** Working directory */
  cwd: string;
}

export interface ErrorReport {
  /** Unique report ID */
  id: string;

  /** Timestamp when error occurred */
  timestamp: string;

  /** Pipeline stage where error occurred */
  stage: PipelineStage;

  /** List of all diagnostics */
  diagnostics: ErrorDiagnostic[];

  /** Git context information */
  gitContext: GitContext;

  /** Environment context */
  environment: EnvironmentContext;

  /** Command that was executed */
  command?: string;

  /** Exit code of failed process */
  exitCode?: number;

  /** Steps to reproduce the error */
  howToReproduce: string[];

  /** Additional context or notes */
  notes?: string;
}

export interface AiFixProposal {
  /** Reference to error report ID */
  reportId: string;

  /** Proposed fix description */
  description: string;

  /** Code changes to apply */
  changes: Array<{
    file: string;
    oldCode: string;
    newCode: string;
    lineStart: number;
    lineEnd: number;
  }>;

  /** Confidence level (0-1) */
  confidence: number;

  /** Explanation of the fix */
  explanation: string;

  /** Commands to run after applying fix */
  postApplyCommands?: string[];

  /** Tests to run to verify fix */
  verificationTests?: string[];
}
