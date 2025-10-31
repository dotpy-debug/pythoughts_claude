/**
 * Comprehensive Any Type Fixer
 *
 * This script systematically replaces `any` types with proper TypeScript types
 * throughout the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const replacements: Replacement[] = [
  // 1. Error catch blocks
  {
    pattern: /catch\s*\(\s*error\s*:\s*any\s*\)/g,
    replacement: 'catch (error: unknown)',
    description: 'Error catch blocks',
  },
  {
    pattern: /catch\s*\(\s*e\s*:\s*any\s*\)/g,
    replacement: 'catch (e: unknown)',
    description: 'Error catch blocks (e)',
  },
  {
    pattern: /catch\s*\(\s*err\s*:\s*any\s*\)/g,
    replacement: 'catch (err: unknown)',
    description: 'Error catch blocks (err)',
  },

  // 2. Record types
  {
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Record<string, unknown>',
  },
  {
    pattern: /Record<any,\s*any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Record<string, unknown>',
  },

  // 3. Array types
  {
    pattern: /:\s*any\[\]/g,
    replacement: ': unknown[]',
    description: 'any[]',
  },

  // 4. Function parameters - generic
  {
    pattern: /\(data:\s*any\)/g,
    replacement: '(data: unknown)',
    description: 'Function parameter (data)',
  },
  {
    pattern: /\(value:\s*any\)/g,
    replacement: '(value: unknown)',
    description: 'Function parameter (value)',
  },
  {
    pattern: /\(item:\s*any\)/g,
    replacement: '(item: unknown)',
    description: 'Function parameter (item)',
  },
  {
    pattern: /\(row:\s*any\)/g,
    replacement: '(row: Record<string, unknown>)',
    description: 'Function parameter (row)',
  },
  {
    pattern: /\(options:\s*any\)/g,
    replacement: '(options: Record<string, unknown>)',
    description: 'Function parameter (options)',
  },

  // 5. Event handlers - React specific
  {
    pattern: /\(e:\s*any\)\s*=>\s*{/g,
    replacement: '(e: React.ChangeEvent<HTMLInputElement>) => {',
    description: 'Event handler parameter (arrow function)',
  },
  {
    pattern: /\(event:\s*any\)\s*=>\s*{/g,
    replacement: '(event: React.ChangeEvent<HTMLInputElement>) => {',
    description: 'Event handler parameter (event, arrow function)',
  },

  // 6. State variables
  {
    pattern: /useState<unknown>/g,
    replacement: 'useState<unknown>',
    description: 'useState<unknown>',
  },
];

async function processFile(filePath: string): Promise<{ modified: boolean; changes: string[] }> {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  const changes: string[] = [];

  for (const { pattern, replacement, description } of replacements) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      newContent = newContent.replace(pattern, replacement as string);
      changes.push(`${description}: ${matches.length} occurrence(s)`);
    }
  }

  const modified = newContent !== content;

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }

  return { modified, changes };
}

async function main() {
  console.log('🔧 Starting comprehensive any type fixes...\n');

  const patterns = ['src/**/*.ts', 'src/**/*.tsx', 'scripts/**/*.ts'];
  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.test.tsx'],
    });
    files.push(...matches);
  }

  console.log(`📁 Found ${files.length} TypeScript files to process\n`);

  let totalModified = 0;
  let totalChanges = 0;

  for (const file of files) {
    const { modified, changes } = await processFile(file);

    if (modified) {
      totalModified++;
      totalChanges += changes.length;
      console.log(`✅ ${file}`);
      changes.forEach((change) => console.log(`   - ${change}`));
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Files processed: ${files.length}`);
  console.log(`   - Files modified: ${totalModified}`);
  console.log(`   - Total changes: ${totalChanges}`);
  console.log(`\n⚠️  Note: Some 'as any' assertions require manual, context-specific fixes.`);
  console.log(`   Run 'npm run lint' to check remaining issues.`);
}

main().catch(console.error);
