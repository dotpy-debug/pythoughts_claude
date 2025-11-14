#!/usr/bin/env tsx
/**
 * Intelligent Change Analysis System
 * Analyzes what changed and determines optimal CI/CD strategy
 */

import {
  categorizeFiles,
  loadChangeRules,
  analyzeFileContent,
} from './utils/file-detector.js';
import {
  getChangedFiles,
  getFileStats,
  getBaseBranch,
  getCurrentBranch,
} from './utils/git-helper.js';
import type { ChangeAnalysis, BuildScope } from '../types/change-analysis.js';

/**
 * Main change analysis function
 */
export async function analyzeChanges(
  baseBranch?: string
): Promise<ChangeAnalysis> {
  const base = baseBranch || getBaseBranch();
  const current = getCurrentBranch();
  const changedFiles = getChangedFiles(base);
  const fileStats = getFileStats(base);
  const rules = loadChangeRules();

  // Categorize all changed files
  const categorized = categorizeFiles(changedFiles);

  // Build category analysis
  const categories: Record<string, any> = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const [category, files] of categorized.entries()) {
    const stats = fileStats.filter((s) => files.includes(s.file));
    const additions = stats.reduce((sum, s) => sum + s.additions, 0);
    const deletions = stats.reduce((sum, s) => sum + s.deletions, 0);

    categories[category] = {
      name: category,
      files,
      hasChanges: files.length > 0,
      linesAdded: additions,
      linesDeleted: deletions,
    };

    totalAdditions += additions;
    totalDeletions += deletions;
  }

  // Determine build scope
  const buildScope = determineBuildScope(categorized, changedFiles.length);

  // Analyze content for indirect impacts
  const contentAnalysis = await analyzeContentImpacts(changedFiles);

  // Determine skip flags
  const skipDatabase = shouldSkipDatabase(
    categorized,
    contentAnalysis.hasDatabase
  );
  const skipRedis = shouldSkipRedis(categorized, contentAnalysis.hasCache);
  const skipIntegration = shouldSkipIntegration(categorized);
  const skipE2E = shouldSkipE2E(categorized);

  // Determine test suites to run
  const testSuitesToRun = determineTestSuites(
    categorized,
    skipDatabase,
    skipRedis,
    skipIntegration,
    skipE2E
  );

  // Calculate optimization metrics
  const { timeSaved, costSaved } = calculateOptimizations(
    skipDatabase,
    skipRedis,
    skipIntegration,
    skipE2E,
    buildScope,
    rules
  );

  // Generate reasoning
  const reasoning = generateReasoning(
    categorized,
    buildScope,
    skipDatabase,
    skipRedis,
    skipIntegration,
    skipE2E,
    contentAnalysis
  );

  return {
    buildScope,
    skipDatabase,
    skipRedis,
    skipIntegration,
    skipE2E,
    testSuitesToRun,
    categories,
    filesChanged: changedFiles.length,
    baseBranch: base,
    currentBranch: current,
    reasoning,
    estimatedTimeSaved: timeSaved,
    estimatedCostSaved: costSaved,
  };
}

/**
 * Determine the appropriate build scope
 */
function determineBuildScope(
  categorized: Map<string, string[]>,
  totalFiles: number
): BuildScope {
  // Documentation only = no build needed
  const docFiles = categorized.get('documentation') || [];
  if (docFiles.length > 0 && totalFiles === docFiles.length) {
    return 'none';
  }

  // Config/styles only = minimal build
  const configFiles = categorized.get('config') || [];
  const styleFiles = categorized.get('styles') || [];
  const testFiles = categorized.get('tests') || [];
  if (
    configFiles.length + styleFiles.length + testFiles.length === totalFiles
  ) {
    return 'minimal';
  }

  // Infrastructure, dependencies, or database = full build
  const infraFiles = categorized.get('infrastructure') || [];
  const depFiles = categorized.get('dependencies') || [];
  const dbFiles = categorized.get('database') || [];
  if (infraFiles.length > 0 || depFiles.length > 0 || dbFiles.length > 0) {
    return 'full';
  }

  // Less than 10 code files = partial build
  const codeFiles = categorized.get('code') || [];
  if (codeFiles.length < 10) {
    return 'partial';
  }

  // Default to full build
  return 'full';
}

/**
 * Analyze content for indirect impacts
 */
async function analyzeContentImpacts(files: string[]): Promise<{
  hasDatabase: boolean;
  hasCache: boolean;
  hasApi: boolean;
}> {
  let hasDatabase = false;
  let hasCache = false;
  let hasApi = false;

  // Only analyze code files to save time
  const codeFiles = files.filter((f) =>
    /\.(ts|tsx|js|jsx)$/.test(f)
  );

  for (const file of codeFiles.slice(0, 20)) {
    // Limit to first 20 files
    const analysis = await analyzeFileContent(file);
    if (analysis.hasDatabase) hasDatabase = true;
    if (analysis.hasCache) hasCache = true;
    if (analysis.hasApi) hasApi = true;
  }

  return { hasDatabase, hasCache, hasApi };
}

/**
 * Should we skip database tests?
 */
function shouldSkipDatabase(
  categorized: Map<string, string[]>,
  hasDbContent: boolean
): boolean {
  const dbFiles = categorized.get('database') || [];
  const codeFiles = categorized.get('code') || [];
  const apiFiles = categorized.get('api') || [];

  // Run if explicit database changes
  if (dbFiles.length > 0) return false;

  // Run if API changes (might affect DB)
  if (apiFiles.length > 0) return false;

  // Run if code has database content
  if (hasDbContent) return false;

  // Skip if only documentation
  const docFiles = categorized.get('documentation') || [];
  const styleFiles = categorized.get('styles') || [];
  if (docFiles.length > 0 && codeFiles.length === 0 && styleFiles.length === 0) {
    return true;
  }

  // Default: run database tests
  return false;
}

/**
 * Should we skip Redis/cache tests?
 */
function shouldSkipRedis(
  categorized: Map<string, string[]>,
  hasCacheContent: boolean
): boolean {
  const cacheFiles = categorized.get('cache') || [];
  const dbFiles = categorized.get('database') || [];

  // Run if explicit cache changes
  if (cacheFiles.length > 0) return false;

  // Run if code has cache content
  if (hasCacheContent) return false;

  // Skip if only documentation or database changes
  const docFiles = categorized.get('documentation') || [];
  if (docFiles.length > 0 || (dbFiles.length > 0 && cacheFiles.length === 0)) {
    return true;
  }

  // Default: run cache tests
  return false;
}

/**
 * Should we skip integration tests?
 */
function shouldSkipIntegration(categorized: Map<string, string[]>): boolean {
  const docFiles = categorized.get('documentation') || [];
  const testFiles = categorized.get('tests') || [];
  const styleFiles = categorized.get('styles') || [];
  const configFiles = categorized.get('config') || [];

  const totalMinor =
    docFiles.length + testFiles.length + styleFiles.length + configFiles.length;

  // Skip if only minor changes
  return totalMinor > 0 && categorized.size === 4;
}

/**
 * Should we skip E2E tests?
 */
function shouldSkipE2E(categorized: Map<string, string[]>): boolean {
  const docFiles = categorized.get('documentation') || [];
  const dbFiles = categorized.get('database') || [];
  const infraFiles = categorized.get('infrastructure') || [];
  const configFiles = categorized.get('config') || [];

  // Skip if only backend changes
  return docFiles.length > 0 || dbFiles.length > 0 || infraFiles.length > 0 || configFiles.length > 0;
}

/**
 * Determine which test suites should run
 */
function determineTestSuites(
  categorized: Map<string, string[]>,
  skipDb: boolean,
  skipRedis: boolean,
  skipInteg: boolean,
  skipE2E: boolean
): string[] {
  const suites: string[] = ['unit']; // Always run unit tests

  if (!skipDb) suites.push('database');
  if (!skipRedis) suites.push('redis');
  if (!skipInteg) suites.push('integration');
  if (!skipE2E) suites.push('e2e');

  return suites;
}

/**
 * Calculate time and cost savings
 */
function calculateOptimizations(
  skipDb: boolean,
  skipRedis: boolean,
  skipInteg: boolean,
  skipE2E: boolean,
  buildScope: BuildScope,
  rules: any
): { timeSaved: number; costSaved: number } {
  const savings = rules.optimization?.estimatedTimeSavings || {
    skipDatabase: 45,
    skipRedis: 30,
    skipIntegration: 120,
    skipE2E: 180,
    documentationOnly: 300,
  };

  const costSavings = rules.optimization?.estimatedCostSavings || {
    skipDatabase: 15,
    skipRedis: 10,
    skipIntegration: 30,
    skipE2E: 40,
    documentationOnly: 90,
  };

  let timeSaved = 0;
  let costSaved = 0;

  if (buildScope === 'none') {
    return {
      timeSaved: savings.documentationOnly,
      costSaved: costSavings.documentationOnly,
    };
  }

  if (skipDb) {
    timeSaved += savings.skipDatabase;
    costSaved += costSavings.skipDatabase;
  }
  if (skipRedis) {
    timeSaved += savings.skipRedis;
    costSaved += costSavings.skipRedis;
  }
  if (skipInteg) {
    timeSaved += savings.skipIntegration;
    costSaved += costSavings.skipIntegration;
  }
  if (skipE2E) {
    timeSaved += savings.skipE2E;
    costSaved += costSavings.skipE2E;
  }

  return { timeSaved, costSaved };
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  categorized: Map<string, string[]>,
  buildScope: BuildScope,
  skipDb: boolean,
  skipRedis: boolean,
  skipInteg: boolean,
  skipE2E: boolean,
  contentAnalysis: any
): string[] {
  const reasoning: string[] = [];

  // Build scope reasoning
  reasoning.push(`Build scope: ${buildScope}`);

  // Category summary
  const activeCategories = Array.from(categorized.entries())
    .filter(([, files]) => files.length > 0)
    .map(([cat, files]) => `${cat} (${files.length} files)`)
    .join(', ');

  if (activeCategories) {
    reasoning.push(`Changed: ${activeCategories}`);
  }

  // Skip reasoning
  if (skipDb) reasoning.push('Skipping database tests (no DB changes detected)');
  if (skipRedis) reasoning.push('Skipping Redis tests (no cache changes detected)');
  if (skipInteg) reasoning.push('Skipping integration tests (minor changes only)');
  if (skipE2E) reasoning.push('Skipping E2E tests (backend-only changes)');

  // Content analysis
  if (contentAnalysis.hasDatabase) {
    reasoning.push('Detected database usage in code');
  }
  if (contentAnalysis.hasCache) {
    reasoning.push('Detected cache usage in code');
  }

  return reasoning;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeChanges()
    .then((analysis) => {
      console.log('\n📊 Change Analysis Results:\n');
      console.log(JSON.stringify(analysis, null, 2));
    })
    .catch((error) => {
      console.error('Error analyzing changes:', error);
      process.exit(1);
    });
}
