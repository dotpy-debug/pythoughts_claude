/**
 * Type definitions for intelligent change detection system
 * Enables smart CI/CD optimization based on what actually changed
 */

export type BuildScope = 'none' | 'minimal' | 'partial' | 'full';

export interface FilePattern {
  /** Glob pattern to match files */
  pattern: string;

  /** Description of what this pattern matches */
  description?: string;

  /** Category for grouping */
  category: string;
}

export interface ChangeCategory {
  /** Category name */
  name: string;

  /** Files that matched this category */
  files: string[];

  /** Whether this category has changes */
  hasChanges: boolean;

  /** Number of lines added */
  linesAdded: number;

  /** Number of lines deleted */
  linesDeleted: number;
}

export interface ChangeAnalysis {
  /** Build scope determination */
  buildScope: BuildScope;

  /** Skip database-related tests */
  skipDatabase: boolean;

  /** Skip Redis/cache tests */
  skipRedis: boolean;

  /** Skip integration tests */
  skipIntegration: boolean;

  /** Skip E2E tests */
  skipE2E: boolean;

  /** Only run specific test suites */
  testSuitesToRun: string[];

  /** Categorized changes */
  categories: Record<string, ChangeCategory>;

  /** Total files changed */
  filesChanged: number;

  /** Base branch compared against */
  baseBranch: string;

  /** Current branch */
  currentBranch: string;

  /** Reasoning for decisions */
  reasoning: string[];

  /** Estimated time saved (seconds) */
  estimatedTimeSaved: number;

  /** Estimated cost saved (percentage) */
  estimatedCostSaved: number;
}

export interface ContentAnalysisResult {
  /** File path analyzed */
  file: string;

  /** Has database imports/keywords */
  hasDatabase: boolean;

  /** Has Redis/cache imports/keywords */
  hasRedis: boolean;

  /** Has API route definitions */
  hasApiRoutes: boolean;

  /** Has GraphQL definitions */
  hasGraphQL: boolean;

  /** Framework detected */
  frameworks: string[];

  /** Dependencies imported */
  imports: string[];
}
