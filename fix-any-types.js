#!/usr/bin/env node
/**
 * Automated Any Type Fixer
 *
 * This script systematically replaces common `any` type patterns with proper TypeScript types.
 */

const fs = require('fs');
const path = require('path');

// Common patterns and their replacements
const patterns = [
  // Event handlers
  { pattern: /\(e:\s*any\)\s*=>/g, replacement: '(e: React.ChangeEvent<HTMLInputElement>) =>' },
  { pattern: /\(event:\s*any\)\s*=>/g, replacement: '(event: React.ChangeEvent<HTMLInputElement>) =>' },
  { pattern: /\(e:\s*any\)\s*{/g, replacement: '(e: React.ChangeEvent<HTMLInputElement>) {' },

  // Select onChange handlers
  { pattern: /onChange=\{([^}]+)e\.target\.value as any/g, replacement: 'onChange={$1e.target.value' },

  // Object types
  { pattern: /:\s*any\[\]/g, replacement: ': Record<string, unknown>[]' },
  { pattern: /Record<string,\s*any>/g, replacement: 'Record<string, unknown>' },
  { pattern: /Record<any,\s*any>/g, replacement: 'Record<string, unknown>' },

  // Function parameters
  { pattern: /\(data:\s*any\)/g, replacement: '(data: unknown)' },
  { pattern: /\(value:\s*any\)/g, replacement: '(value: unknown)' },
  { pattern: /\(item:\s*any\)/g, replacement: '(item: unknown)' },
  { pattern: /\(row:\s*any\)/g, replacement: '(row: Record<string, unknown>)' },

  // State and variables
  { pattern: /const \[([^,]+),\s*set[^\]]+\] = useState<any>/g, replacement: 'const [$1, set$1] = useState<unknown>' },

  // Error handling
  { pattern: /catch\s*\(error:\s*any\)/g, replacement: 'catch (error: unknown)' },
  { pattern: /catch\s*\(e:\s*any\)/g, replacement: 'catch (e: unknown)' },
  { pattern: /catch\s*\(err:\s*any\)/g, replacement: 'catch (err: unknown)' },
];

// Files to process
const filesToProcess = [
  // Admin components
  'src/components/admin/AnalyticsDashboard.tsx',
  'src/components/admin/CategoriesTagsManagement.tsx',
  'src/components/admin/ContentModeration.tsx',
  'src/components/admin/PublicationsManagement.tsx',
  'src/components/admin/UserManagement.tsx',
  'src/components/admin/DatabaseBrowser.tsx',
  'src/components/admin/PermissionsManagement.tsx',
  'src/components/admin/SystemSettings.tsx',

  // Blog components
  'src/components/blogs/BlogCompactCard.tsx',
  'src/components/blogs/BlogHeroCard.tsx',
  'src/components/blogs/BlogOfTheDaySection.tsx',

  // Publication components
  'src/components/publications/CrossPostDialog.tsx',
  'src/components/publications/ModerationDashboard.tsx',
  'src/components/publications/PublicationHomepage.tsx',
  'src/components/publications/RevenueSharing.tsx',

  // Other components
  'src/components/analytics/AnalyticsExporter.tsx',
  'src/components/comments/CommentEditForm.tsx',
  'src/components/comments/CommentReactions.tsx',
  'src/components/recommendations/RecommendedPosts.tsx',

  // Pages
  'src/pages-vite/PublicationDetailPage.tsx',
  'src/pages-vite/PublicationSettingsPage.tsx',
  'src/pages-vite/PublicationsPage.tsx',
  'src/pages-vite/SeriesDetailPage.tsx',
  'src/pages-vite/SeriesPage.tsx',

  // Utilities
  'src/lib/email-queue.ts',
];

function processFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  patterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏭️  Skipped (no matches): ${filePath}`);
  }
}

console.log('🔧 Starting automated any type fixes...\n');

filesToProcess.forEach(processFile);

console.log('\n✨ Automated fixes complete!');
console.log('⚠️  Please review changes and manually fix remaining cases.');
