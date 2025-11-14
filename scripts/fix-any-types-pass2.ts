/**
 * Any Type Fixer - Pass 2
 *
 * Handles context-specific 'as any' type assertions that require
 * understanding of the codebase structure.
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
  // Admin Components
  {
    filePath: 'src/components/admin/CategoriesTagsManagement.tsx',
    replacements: [
      {
        search: 'setTagSortBy(e.target.value as any)',
        replace: 'setTagSortBy(e.target.value as "name" | "usage" | "recent")',
        description: 'Tag sort by selector',
      },
    ],
  },
  {
    filePath: 'src/components/admin/ContentModeration.tsx',
    replacements: [
      {
        search: 'status: reportStatus as any,',
        replace: 'status: reportStatus as "pending" | "reviewed" | "resolved" | "dismissed" | undefined,',
        description: 'Report status filter',
      },
      {
        search: 'filter: postFilter as any,',
        replace: 'filter: postFilter as "all" | "flagged" | "reported" | undefined,',
        description: 'Post filter',
      },
    ],
  },
  {
    filePath: 'src/components/admin/UserManagement.tsx',
    replacements: [
      {
        search: 'role: (roleFilter || undefined) as any,',
        replace: 'role: (roleFilter || undefined) as "admin" | "moderator" | "user" | undefined,',
        description: 'Role filter',
      },
      {
        search: 'newRole: newRole as any,',
        replace: 'newRole: newRole as "admin" | "moderator" | "user",',
        description: 'New role assignment',
      },
      {
        search: 'setSuspendType(e.target.value as any)',
        replace: 'setSuspendType(e.target.value as "temporary" | "permanent")',
        description: 'Suspend type selector',
      },
    ],
  },
  {
    filePath: 'src/components/analytics/AnalyticsExporter.tsx',
    replacements: [
      {
        search: 'format: fmt.value as any,',
        replace: 'format: fmt.value as "json" | "csv" | "xlsx" | "pdf",',
        description: 'Export format',
      },
    ],
  },
  {
    filePath: 'src/components/comments/CommentEditForm.tsx',
    replacements: [
      {
        search: 'handleSubmit(e as any);',
        replace: 'handleSubmit(e as React.FormEvent<HTMLFormElement>);',
        description: 'Form submit event',
      },
    ],
  },
  {
    filePath: 'src/lib/email-queue.ts',
    replacements: [
      {
        search: 'throw new Error(`Unknown email type: ${(job.data as any).type}`);',
        replace: 'throw new Error(`Unknown email type: ${(job.data as Record<string, unknown>).type}`);',
        description: 'Email queue job data',
      },
    ],
  },

  // Blog components - Add view_count, clap_count, comment_count to Post type
  {
    filePath: 'src/components/blogs/BlogCompactCard.tsx',
    replacements: [
      {
        search: 'const viewCount = (blog as any).view_count || 0;',
        replace: 'const viewCount = (blog as { view_count?: number }).view_count || 0;',
        description: 'Blog view count',
      },
      {
        search: 'const clapCount = (blog as any).clap_count || 0;',
        replace: 'const clapCount = (blog as { clap_count?: number }).clap_count || 0;',
        description: 'Blog clap count',
      },
      {
        search: 'const commentCount = (blog as any).comment_count || 0;',
        replace: 'const commentCount = (blog as { comment_count?: number }).comment_count || 0;',
        description: 'Blog comment count',
      },
    ],
  },
  {
    filePath: 'src/components/blogs/BlogHeroCard.tsx',
    replacements: [
      {
        search: 'const viewCount = (blog as any).view_count || 0;',
        replace: 'const viewCount = (blog as { view_count?: number }).view_count || 0;',
        description: 'Blog view count',
      },
      {
        search: 'const clapCount = (blog as any).clap_count || 0;',
        replace: 'const clapCount = (blog as { clap_count?: number }).clap_count || 0;',
        description: 'Blog clap count',
      },
      {
        search: 'const commentCount = (blog as any).comment_count || 0;',
        replace: 'const commentCount = (blog as { comment_count?: number }).comment_count || 0;',
        description: 'Blog comment count',
      },
    ],
  },
  {
    filePath: 'src/components/blogs/BlogOfTheDaySection.tsx',
    replacements: [
      {
        search: 'const viewCount = (blog as any).view_count || 0;',
        replace: 'const viewCount = (blog as { view_count?: number }).view_count || 0;',
        description: 'Blog view count',
      },
      {
        search: 'const clapCount = (blog as any).clap_count || 0;',
        replace: 'const clapCount = (blog as { clap_count?: number }).clap_count || 0;',
        description: 'Blog clap count',
      },
      {
        search: 'const commentCount = (blog as any).comment_count || 0;',
        replace: 'const commentCount = (blog as { comment_count?: number }).comment_count || 0;',
        description: 'Blog comment count',
      },
    ],
  },

  // Publication components - Supabase joins
  {
    filePath: 'src/components/admin/PublicationsManagement.tsx',
    replacements: [
      {
        search: '{(member as any).profiles?.username || \'Unknown\'}',
        replace: '{(member as { profiles?: { username?: string } }).profiles?.username || \'Unknown\'}',
        description: 'Member profiles join',
      },
      {
        search: '{(submission as any).posts?.title || \'Untitled Post\'}',
        replace: '{(submission as { posts?: { title?: string } }).posts?.title || \'Untitled Post\'}',
        description: 'Submission posts join',
      },
      {
        search: 'by {(submission as any).submitter?.username || \'Unknown\'}',
        replace: 'by {(submission as { submitter?: { username?: string } }).submitter?.username || \'Unknown\'}',
        description: 'Submitter join',
      },
    ],
  },
  {
    filePath: 'src/pages-vite/PublicationDetailPage.tsx',
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

  // UI components
  {
    filePath: 'src/components/ui/popover.tsx',
    replacements: [
      {
        search: '} as any);',
        replace: '} as React.CSSProperties);',
        description: 'CSS properties object',
      },
    ],
  },

  // Recommendations
  {
    filePath: 'src/components/recommendations/RecommendedPosts.tsx',
    replacements: [
      {
        search: 'const post = item.posts as any;',
        replace: 'const post = item.posts as { id: string; title: string; slug: string; excerpt?: string; author_id: string };',
        description: 'Recommended post join',
      },
    ],
  },

  // User management - optional properties
  {
    filePath: 'src/components/admin/UserManagement.tsx',
    replacements: [
      {
        search: 'setNotes((user as any).admin_notes || \'\');',
        replace: 'setNotes((user as { admin_notes?: string }).admin_notes || \'\');',
        description: 'User admin notes',
      },
      {
        search: '{(user as any).is_suspended && (',
        replace: '{(user as { is_suspended?: boolean }).is_suspended && (',
        description: 'User suspended check',
      },
      {
        search: '{(user as any).is_banned && (',
        replace: '{(user as { is_banned?: boolean }).is_banned && (',
        description: 'User banned check',
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
  console.log('🔧 Starting context-specific any type fixes (Pass 2)...\n');

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
  console.log(`\n⚠️  Run 'npm run lint' to check remaining issues.`);
}

main().catch(console.error);
