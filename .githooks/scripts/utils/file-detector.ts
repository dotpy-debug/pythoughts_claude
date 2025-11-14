/**
 * File Pattern Detection Utility
 * Matches files against patterns defined in change-rules.yml
 */

import { minimatch } from 'minimatch';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface FilePattern {
  pattern: string | string[];
  description?: string;
}

export interface ChangeRules {
  version: string;
  patterns: Record<string, string[] | FilePattern>;
  contentKeywords: Record<string, { imports?: string[]; keywords?: string[] }>;
  skipRules: Record<string, any>;
  buildScope: Record<string, any>;
  optimization: Record<string, any>;
}

let cachedRules: ChangeRules | null = null;

/**
 * Load change detection rules from YAML
 */
export function loadChangeRules(): ChangeRules {
  if (cachedRules) {
    return cachedRules;
  }

  const rulesPath = path.join(
    process.cwd(),
    '.githooks/config/change-rules.yml'
  );

  if (!fs.existsSync(rulesPath)) {
    console.warn('⚠️  Change rules not found, using defaults');
    return getDefaultRules();
  }

  try {
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
    cachedRules = yaml.load(rulesContent) as ChangeRules;
    return cachedRules;
  } catch (error) {
    console.error('Error loading change rules:', error);
    return getDefaultRules();
  }
}

/**
 * Default rules if config file doesn't exist
 */
function getDefaultRules(): ChangeRules {
  return {
    version: '1.0.0',
    patterns: {
      documentation: ['**/*.md', '**/docs/**/*'],
      code: ['src/**/*.{ts,tsx,js,jsx}'],
      database: ['**/migrations/**/*', '**/db/schema.ts'],
      cache: ['**/redis/**/*', '**/cache/**/*'],
      tests: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
      styles: ['**/*.css', '**/*.scss'],
      infrastructure: ['**/Dockerfile*', '**/.github/workflows/**/*'],
      dependencies: ['**/package.json', '**/package-lock.json'],
    },
    contentKeywords: {},
    skipRules: {},
    buildScope: {},
    optimization: {},
  };
}

/**
 * Match a file against patterns
 */
export function matchesPattern(
  file: string,
  patterns: string | string[]
): boolean {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternsArray) {
    if (minimatch(file, pattern, { dot: true, matchBase: true })) {
      return true;
    }
  }

  return false;
}

/**
 * Categorize files based on patterns
 */
export function categorizeFiles(files: string[]): Map<string, string[]> {
  const rules = loadChangeRules();
  const categorized = new Map<string, string[]>();

  // Initialize categories
  for (const category of Object.keys(rules.patterns)) {
    categorized.set(category, []);
  }

  // Categorize each file
  for (const file of files) {
    for (const [category, patternDef] of Object.entries(rules.patterns)) {
      const patterns = Array.isArray(patternDef)
        ? patternDef
        : typeof patternDef === 'object' && 'pattern' in patternDef
        ? Array.isArray(patternDef.pattern)
          ? patternDef.pattern
          : [patternDef.pattern]
        : [];

      if (matchesPattern(file, patterns)) {
        categorized.get(category)?.push(file);
      }
    }
  }

  return categorized;
}

/**
 * Check if a file contains specific keywords
 */
export function hasKeyword(
  file: string,
  keywords: string[]
): Promise<boolean> {
  return new Promise((resolve) => {
    const filePath = path.join(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      return resolve(false);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasMatch = keywords.some((keyword) => content.includes(keyword));
      resolve(hasMatch);
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Analyze file content for database/cache/api patterns
 */
export async function analyzeFileContent(file: string): Promise<{
  hasDatabase: boolean;
  hasCache: boolean;
  hasApi: boolean;
  imports: string[];
}> {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    return { hasDatabase: false, hasCache: false, hasApi: false, imports: [] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = loadChangeRules();

    // Extract imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Check for database patterns
    const dbKeywords = [
      ...(rules.contentKeywords.database?.imports || []),
      ...(rules.contentKeywords.database?.keywords || []),
    ];
    const hasDatabase = dbKeywords.some(
      (keyword) =>
        content.includes(keyword) || imports.some((imp) => imp.includes(keyword))
    );

    // Check for cache patterns
    const cacheKeywords = [
      ...(rules.contentKeywords.cache?.imports || []),
      ...(rules.contentKeywords.cache?.keywords || []),
    ];
    const hasCache = cacheKeywords.some(
      (keyword) =>
        content.includes(keyword) || imports.some((imp) => imp.includes(keyword))
    );

    // Check for API patterns
    const apiKeywords = rules.contentKeywords.api?.keywords || [];
    const hasApi = apiKeywords.some((keyword) => content.includes(keyword));

    return { hasDatabase, hasCache, hasApi, imports };
  } catch (error) {
    return { hasDatabase: false, hasCache: false, hasApi: false, imports: [] };
  }
}
