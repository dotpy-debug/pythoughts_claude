/**
 * Any Type Fixer - Pass 3
 *
 * Final cleanup of remaining 'as any' assertions.
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
    filePath: 'src/pages-vite/PublicationSettingsPage.tsx',
    replacements: [
      {
        search: '{(member.profiles as any)?.avatar_url ? (',
        replace: '{(member.profiles as { avatar_url?: string } | null)?.avatar_url ? (',
        description: 'Member profiles avatar check',
      },
      {
        search: 'src={(member.profiles as any).avatar_url}',
        replace: 'src={(member.profiles as { avatar_url?: string } | null)?.avatar_url || \'\'}',
        description: 'Member profiles avatar src',
      },
      {
        search: 'alt={(member.profiles as any)?.username}',
        replace: 'alt={(member.profiles as { username?: string } | null)?.username || \'User\'}',
        description: 'Member profiles username alt',
      },
      {
        search: '{(member.profiles as any)?.username}',
        replace: '{(member.profiles as { username?: string } | null)?.username || \'Unknown User\'}',
        description: 'Member profiles username display',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/PublicationsPage.tsx',
    replacements: [
      {
        search: '<span>{(publication as any).publication_members?.length || 0} members</span>',
        replace: '<span>{(publication as { publication_members?: unknown[] }).publication_members?.length || 0} members</span>',
        description: 'Publication members count',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/SeriesDetailPage.tsx',
    replacements: [
      {
        search: '<span>by {(series.profiles as any)?.username}</span>',
        replace: '<span>by {(series.profiles as { username?: string } | null)?.username || \'Unknown\'}</span>',
        description: 'Series author username',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/SeriesPage.tsx',
    replacements: [
      {
        search: '<span>{(series as any).series_posts?.length || 0} posts</span>',
        replace: '<span>{(series as { series_posts?: unknown[] }).series_posts?.length || 0} posts</span>',
        description: 'Series posts count',
      },
      {
        search: '<span>by {(series.profiles as any)?.username}</span>',
        replace: '<span>by {(series.profiles as { username?: string } | null)?.username || \'Unknown\'}</span>',
        description: 'Series author username',
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
  console.log('🔧 Starting final any type fixes (Pass 3)...\n');

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
  console.log(`\n🎉 All 'as any' assertions should now be fixed!`);
  console.log(`   Run 'npm run lint' to verify.`);
}

main().catch(console.error);
