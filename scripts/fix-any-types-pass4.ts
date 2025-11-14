/**
 * Any Type Fixer - Pass 4
 *
 * Final cleanup of remaining ': any' type annotations (not 'as any').
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface FileReplacement {
  filePath: string;
  replacements: Array<{
    search: string;
    replace: string;
    description: string;
  }>;
}

const fileReplacements: FileReplacement[] = [
  {
    filePath: 'src/components/admin/DatabaseBrowser.tsx',
    replacements: [
      {
        search: 'const handleEditRecord = (record: any) => {',
        replace: 'const handleEditRecord = (record: Record<string, unknown>) => {',
        description: 'Edit record handler',
      },
    ],
  },
  {
    filePath: 'src/components/admin/SystemSettings.tsx',
    replacements: [
      {
        search: 'const updateSettingValue = (key: string, field: string, value: any) => {',
        replace: 'const updateSettingValue = (key: string, field: string, value: unknown) => {',
        description: 'Update setting value',
      },
    ],
  },
  {
    filePath: 'src/components/blog/collaboration/PresenceBar.tsx',
    replacements: [
      {
        search: '.filter((state: any) => state.user && state.user.id)',
        replace: '.filter((state: { user?: { id?: string } }) => state.user && state.user.id)',
        description: 'Presence state filter',
      },
      {
        search: '.map((state: any) => ({',
        replace: '.map((state: { user: { id: string; name: string; color: string } }) => ({',
        description: 'Presence state map',
      },
    ],
  },
  {
    filePath: 'src/components/moderation/ReportModal.tsx',
    replacements: [
      {
        search: 'const reportData: any = {',
        replace: 'const reportData: Record<string, unknown> = {',
        description: 'Report data object',
      },
    ],
  },
  {
    filePath: 'src/components/publications/CrossPostDialog.tsx',
    replacements: [
      {
        search: '.filter((m: any) => {',
        replace: '.filter((m: { role?: string }) => {',
        description: 'Member filter',
      },
      {
        search: '.map((m: any) => ({',
        replace: '.map((m: { publication_id: string; publications?: { name?: string } }) => ({',
        description: 'Member map',
      },
    ],
  },
  {
    filePath: 'src/components/publications/ModerationDashboard.tsx',
    replacements: [
      {
        search: 'metadata: any;',
        replace: 'metadata: Record<string, unknown>;',
        description: 'Moderation log metadata',
      },
      {
        search: '(log: any) => new Date(log.created_at) >= today',
        replace: '(log: { created_at: string }) => new Date(log.created_at) >= today',
        description: 'Today logs filter',
      },
      {
        search: 'approvedToday: todayLogs.filter((log: any) => log.action_type === \'post_approved\').length,',
        replace: 'approvedToday: todayLogs.filter((log: { action_type?: string }) => log.action_type === \'post_approved\').length,',
        description: 'Approved today count',
      },
      {
        search: 'rejectedToday: todayLogs.filter((log: any) => log.action_type === \'post_rejected\').length,',
        replace: 'rejectedToday: todayLogs.filter((log: { action_type?: string }) => log.action_type === \'post_rejected\').length,',
        description: 'Rejected today count',
      },
    ],
  },
  {
    filePath: 'src/components/video/VideoEmbedModal.tsx',
    replacements: [
      {
        search: 'const handleOptionChange = (key: keyof VideoPlayerOptions, value: any) => {',
        replace: 'const handleOptionChange = (key: keyof VideoPlayerOptions, value: unknown) => {',
        description: 'Video option change handler',
      },
    ],
  },
  {
    filePath: 'src/lib/email-queue.ts',
    replacements: [
      {
        search: '[key: string]: any;',
        replace: '[key: string]: unknown;',
        description: 'Email data index signature',
      },
    ],
  },
  {
    filePath: 'src/lib/markdown-converter.ts',
    replacements: [
      {
        search: '[key: string]: any;',
        replace: '[key: string]: unknown;',
        description: 'Markdown converter options index signature',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/BookmarksPage.tsx',
    replacements: [
      {
        search: '?.map((bookmark: any) => bookmark.posts)',
        replace: '?.map((bookmark: { posts?: unknown }) => bookmark.posts)',
        description: 'Bookmark posts map',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/EnhancedAnalyticsPage.tsx',
    replacements: [
      {
        search: 'labels: timeSeriesData.views?.map((p: any) => p.date) || [],',
        replace: 'labels: timeSeriesData.views?.map((p: { date: string }) => p.date) || [],',
        description: 'Time series labels',
      },
      {
        search: 'data: timeSeriesData.views?.map((p: any) => p.value) || [],',
        replace: 'data: timeSeriesData.views?.map((p: { value: number }) => p.value) || [],',
        description: 'Views data',
      },
      {
        search: 'data: timeSeriesData.reads?.map((p: any) => p.value) || [],',
        replace: 'data: timeSeriesData.reads?.map((p: { value: number }) => p.value) || [],',
        description: 'Reads data',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/ModerationPage.tsx',
    replacements: [
      {
        search: 'const updateData: any = {',
        replace: 'const updateData: Record<string, unknown> = {',
        description: 'Update data object',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/PublicationsPage.tsx',
    replacements: [
      {
        search: '?.map((member: any) => member.publications)',
        replace: '?.map((member: { publications?: unknown }) => member.publications)',
        description: 'Member publications map',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/SearchResultsPage.tsx',
    replacements: [
      {
        search: '...postsData.map((post: any) => ({',
        replace: '...postsData.map((post: Record<string, unknown>) => ({',
        description: 'Posts data map',
      },
      {
        search: '...pubsData.map((pub: any) => ({',
        replace: '...pubsData.map((pub: Record<string, unknown>) => ({',
        description: 'Publications data map',
      },
      {
        search: '...seriesData.map((series: any) => ({',
        replace: '...seriesData.map((series: Record<string, unknown>) => ({',
        description: 'Series data map',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/SeriesDetailPage.tsx',
    replacements: [
      {
        search: '?.map((sp: any) => sp.posts)',
        replace: '?.map((sp: { posts?: unknown }) => sp.posts)',
        description: 'Series posts map',
      },
    ],
  },
  {
    filePath: 'src/services/featured.ts',
    replacements: [
      {
        search: 'const blogs: BlogPost[] = (data || []).map((post: any) => ({',
        replace: 'const blogs: BlogPost[] = (data || []).map((post: Record<string, unknown>) => ({',
        description: 'Featured blogs map',
      },
      {
        search: 'post: any;',
        replace: 'post: Record<string, unknown>;',
        description: 'Trending post type',
      },
    ],
  },
  {
    filePath: 'src/utils/autoFlag.ts',
    replacements: [
      {
        search: 'const reportData: any = {',
        replace: 'const reportData: Record<string, unknown> = {',
        description: 'Auto-flag report data',
      },
    ],
  },
];

async function processFile(fileReplacement: FileReplacement): Promise<number> {
  const { filePath, replacements } = fileReplacement;
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;

  for (const { search, replace, description } of replacements) {
    if (content.includes(search)) {
      content = content.replace(search, replace);
      console.log(`   ✓ ${description}`);
      changeCount++;
    }
  }

  if (changeCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  return changeCount;
}

async function main() {
  console.log('🔧 Starting final any type annotations fix (Pass 4)...\n');

  let totalFiles = 0;
  let totalChanges = 0;

  for (const fileReplacement of fileReplacements) {
    console.log(`\n📄 ${fileReplacement.filePath}`);
    const changes = await processFile(fileReplacement);

    if (changes > 0) {
      totalFiles++;
      totalChanges += changes;
    } else {
      console.log('   ⏭️  No changes needed');
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Files modified: ${totalFiles}`);
  console.log(`   - Total changes: ${totalChanges}`);
  console.log(`\n🎉 All ': any' type annotations should now be fixed!`);
  console.log(`   Run 'npm run lint' to verify.`);
}

main().catch(console.error);
