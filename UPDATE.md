# Blog Enhancement Implementation Plan - Execution Guide

**Project:** Blog Experience Revamp
**Version:** 1.1
**Target Stack:** Next.js 15 / React 19 / Tailwind 4 / shadcn-ui / Radix UI / tiptap
**Timeline:** 12 weeks (3 months)
**Last Updated:** October 26, 2025

---

## Executive Summary

This document serves as the **actionable execution plan** for transforming the Pythoughts blogging system into a production-ready platform with:
- Canvas-style rich editor using tiptap
- Persistent floating TOC with scroll spy
- Medium-inspired reading experience with terminal aesthetic
- Full WYSIWYG authoring workflow

---

## Table of Contents

1. [Pre-Implementation Setup](#pre-implementation-setup)
2. [Phase 1: Foundation & Dependencies](#phase-1-foundation--dependencies)
3. [Phase 2: Reader Experience](#phase-2-reader-experience)
4. [Phase 3: Editor Canvas](#phase-3-editor-canvas)
5. [Phase 4: Integration & Polish](#phase-4-integration--polish)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Rollback Procedures](#rollback-procedures)

---

## Pre-Implementation Setup

### 1.1 Environment Preparation

**Dependencies to Install:**

```bash
# Core editor dependencies
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-typography
npm install @tiptap/extension-code-block-lowlight @tiptap/extension-table
npm install @tiptap/extension-task-list @tiptap/extension-task-item
npm install @tiptap/extension-placeholder @tiptap/extension-character-count

# Syntax highlighting for code blocks
npm install lowlight highlight.js

# Additional UI components
npm install @radix-ui/react-sheet @radix-ui/react-separator
npm install @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area

# Utilities
npm install slugify html-to-text
npm install -D @types/slugify
```

**Dev Dependencies:**

```bash
npm install -D @playwright/test vitest @vitest/ui
npm install -D @testing-library/react @testing-library/user-event
```

### 1.2 Database Schema Updates

**Create migration file: `migrations/001_blog_enhancements.sql`**

```sql
-- Blog posts enhanced schema
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS toc_data JSONB DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_alt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_title VARCHAR(100);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_description VARCHAR(260);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_reading_time ON posts(reading_time_minutes);

-- Blog series table
CREATE TABLE IF NOT EXISTS blog_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  author_id UUID REFERENCES profiles(id),
  post_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link posts to series
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES blog_series(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series_order INTEGER;

-- TOC analytics tracking
CREATE TABLE IF NOT EXISTS toc_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  heading_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'click', 'view', 'scroll_past'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_toc_interactions_post ON toc_interactions(post_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_toc_interactions_user ON toc_interactions(user_id, timestamp);

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  progress_percentage INTEGER DEFAULT 0,
  last_position VARCHAR(100), -- heading ID where they stopped
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments with threading
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON post_comments(parent_id);
```

### 1.3 Directory Structure Setup

```bash
# Create new directories
mkdir -p src/components/blog/editor
mkdir -p src/components/blog/reader
mkdir -p src/components/blog/toc
mkdir -p src/lib/tiptap
mkdir -p src/utils/blog
mkdir -p src/app/dashboard/blog
mkdir -p tests/blog
```

---

## Phase 1: Foundation & Dependencies (Week 1-2)

### Task 1.1: Content Model & Types

**File: `src/types/blog.ts`**

```typescript
import { JSONContent } from '@tiptap/react';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content_json: JSONContent; // tiptap document
  content_html: string; // pre-rendered HTML
  toc_data: TOCItem[];
  author_id: string;
  author?: BlogAuthor;
  cover_image?: string;
  cover_image_alt?: string;
  status: 'draft' | 'published' | 'scheduled';
  tags: string[];
  category?: string;
  reading_time_minutes: number;
  word_count: number;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical_url?: string;
  series_id?: string;
  series_order?: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TOCItem {
  id: string;
  text: string;
  level: number; // 1-6 for h1-h6
  children?: TOCItem[];
}

export interface BlogAuthor {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  follower_count?: number;
}

export interface BlogEditorState {
  post: Partial<BlogPost>;
  isSaving: boolean;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
}
```

**Acceptance Criteria:**
- [ ] All TypeScript interfaces defined
- [ ] Types exported from barrel file
- [ ] No TypeScript errors
- [ ] Compatible with Supabase schema

---

### Task 1.2: TOC Generator Utility

**File: `src/utils/blog/toc-generator.ts`**

```typescript
import slugify from 'slugify';
import { JSONContent } from '@tiptap/react';
import { TOCItem } from '@/types/blog';

export class TOCGenerator {
  private usedSlugs = new Set<string>();

  /**
   * Generate stable, unique slug for heading
   */
  generateSlug(text: string): string {
    let baseSlug = slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Handle empty slugs
    if (!baseSlug) {
      baseSlug = 'heading';
    }

    // Ensure uniqueness
    let finalSlug = baseSlug;
    let counter = 1;

    while (this.usedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.usedSlugs.add(finalSlug);
    return finalSlug;
  }

  /**
   * Extract TOC from tiptap JSON
   */
  extractFromJSON(content: JSONContent): TOCItem[] {
    const headings: TOCItem[] = [];
    this.usedSlugs.clear();

    const traverse = (node: JSONContent) => {
      if (node.type === 'heading' && node.content) {
        const level = node.attrs?.level || 1;
        const text = this.extractText(node);

        if (text && level >= 2 && level <= 4) { // Only h2-h4 in TOC
          const id = this.generateSlug(text);

          headings.push({
            id,
            text,
            level,
          });
        }
      }

      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    if (content.content) {
      content.content.forEach(traverse);
    }

    return this.buildHierarchy(headings);
  }

  /**
   * Extract plain text from tiptap node
   */
  private extractText(node: JSONContent): string {
    if (!node.content) return '';

    return node.content
      .map(child => {
        if (child.type === 'text') return child.text || '';
        if (child.content) return this.extractText(child);
        return '';
      })
      .join('');
  }

  /**
   * Build hierarchical TOC structure
   */
  private buildHierarchy(flatItems: TOCItem[]): TOCItem[] {
    const root: TOCItem[] = [];
    const stack: TOCItem[] = [];

    flatItems.forEach(item => {
      // Pop stack until we find correct parent
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      const newItem = { ...item, children: [] };

      if (stack.length === 0) {
        root.push(newItem);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      }

      stack.push(newItem);
    });

    return root;
  }

  /**
   * Flatten hierarchical TOC
   */
  flattenTOC(items: TOCItem[]): TOCItem[] {
    const result: TOCItem[] = [];

    const traverse = (items: TOCItem[]) => {
      items.forEach(item => {
        result.push(item);
        if (item.children) {
          traverse(item.children);
        }
      });
    };

    traverse(items);
    return result;
  }
}

/**
 * Calculate reading time from word count
 */
export function calculateReadingTime(wordCount: number, wpm: number = 200): number {
  return Math.ceil(wordCount / wpm);
}

/**
 * Extract word count from tiptap JSON
 */
export function extractWordCount(content: JSONContent): number {
  let count = 0;

  const traverse = (node: JSONContent) => {
    if (node.type === 'text' && node.text) {
      count += node.text.split(/\s+/).filter(word => word.length > 0).length;
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  if (content.content) {
    content.content.forEach(traverse);
  }

  return count;
}
```

**Acceptance Criteria:**
- [ ] Generates stable, unique slugs for headings
- [ ] Handles duplicate heading text correctly
- [ ] Supports international characters
- [ ] Builds proper hierarchical structure
- [ ] Calculates accurate word count and reading time
- [ ] Unit tests pass (see testing section)

---

### Task 1.3: HTML Renderer from Tiptap

**File: `src/utils/blog/tiptap-renderer.ts`**

```typescript
import { JSONContent } from '@tiptap/react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { lowlight } from 'lowlight';
import { TOCGenerator } from './toc-generator';

const extensions = [
  StarterKit.configure({
    codeBlock: false, // We use CodeBlockLowlight instead
  }),
  Typography,
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem,
];

/**
 * Inject heading IDs into tiptap JSON for anchors
 */
export function injectHeadingIds(content: JSONContent): JSONContent {
  const generator = new TOCGenerator();

  const traverse = (node: JSONContent): JSONContent => {
    if (node.type === 'heading' && node.content) {
      const text = generator['extractText'](node); // Access private method
      const id = generator.generateSlug(text);

      return {
        ...node,
        attrs: {
          ...node.attrs,
          id,
        },
        content: node.content.map(traverse),
      };
    }

    if (node.content) {
      return {
        ...node,
        content: node.content.map(traverse),
      };
    }

    return node;
  };

  return {
    ...content,
    content: content.content?.map(traverse),
  };
}

/**
 * Convert tiptap JSON to HTML
 */
export function tiptapToHTML(content: JSONContent): string {
  const contentWithIds = injectHeadingIds(content);
  return generateHTML(contentWithIds, extensions);
}
```

**Acceptance Criteria:**
- [ ] Converts tiptap JSON to HTML correctly
- [ ] Injects stable heading IDs
- [ ] Supports all content types (code blocks, tables, etc.)
- [ ] Generated HTML matches editor preview
- [ ] Syntax highlighting works in output

---

## Phase 2: Reader Experience (Week 3-4)

### Task 2.1: Persistent Floating TOC Component

**File: `src/components/blog/toc/FloatingTOC.tsx`**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, List } from 'lucide-react';
import { TOCItem } from '@/types/blog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface FloatingTOCProps {
  items: TOCItem[];
  className?: string;
}

export function FloatingTOC({ items, className }: FloatingTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Set up IntersectionObserver for scroll spy
    const options = {
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    observerRef.current = new IntersectionObserver(callback, options);

    // Observe all heading elements
    const flatItems = flattenTOC(items);
    flatItems.forEach(item => {
      const element = document.getElementById(item.id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [items]);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setIsMobileOpen(false);
    }
  };

  const renderTOCItem = (item: TOCItem, depth: number = 0) => {
    const isActive = activeId === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.id} className={cn('relative', depth > 0 && 'ml-4')}>
        <button
          onClick={() => handleItemClick(item.id)}
          className={cn(
            'w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200',
            'hover:bg-white/5 hover:text-[#27C93F]',
            isActive && 'text-[#27C93F] font-medium bg-[#27C93F]/10',
            !isActive && 'text-[#E6EDF3]/70'
          )}
        >
          <span className="flex items-center gap-2">
            {hasChildren && (
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform',
                  isActive && 'rotate-90'
                )}
              />
            )}
            {item.text}
          </span>
        </button>

        {hasChildren && (
          <ul className="mt-1 space-y-1">
            {item.children!.map(child => renderTOCItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (items.length === 0) return null;

  // Desktop floating TOC
  const DesktopTOC = (
    <nav
      className={cn(
        'hidden lg:block sticky top-24 w-[220px]',
        'bg-[#161b22]/70 backdrop-blur-md border border-white/10 rounded-xl',
        'p-4 max-h-[calc(100vh-120px)]',
        className
      )}
      aria-label="Table of contents"
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <List size={16} className="text-[#27C93F]" />
        <h3 className="text-sm font-semibold text-[#E6EDF3]">On this page</h3>
      </div>

      <ScrollArea className="h-full">
        <ul className="space-y-1">
          {items.map(item => renderTOCItem(item))}
        </ul>
      </ScrollArea>
    </nav>
  );

  // Mobile TOC (Sheet)
  const MobileTOC = (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#27C93F] text-[#0d1117] p-4 rounded-full shadow-lg hover:bg-[#27C93F]/90 transition-colors"
          aria-label="Open table of contents"
        >
          <List size={24} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0d1117] border-white/10 w-80">
        <div className="flex items-center gap-2 mb-4">
          <List size={16} className="text-[#27C93F]" />
          <h3 className="text-sm font-semibold text-[#E6EDF3]">On this page</h3>
        </div>

        <ScrollArea className="h-full">
          <ul className="space-y-1">
            {items.map(item => renderTOCItem(item))}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {DesktopTOC}
      {MobileTOC}
    </>
  );
}

function flattenTOC(items: TOCItem[]): TOCItem[] {
  const result: TOCItem[] = [];

  const traverse = (items: TOCItem[]) => {
    items.forEach(item => {
      result.push(item);
      if (item.children) {
        traverse(item.children);
      }
    });
  };

  traverse(items);
  return result;
}
```

**Acceptance Criteria:**
- [ ] TOC renders on left side on desktop (sticky)
- [ ] Active section highlighted on scroll
- [ ] Smooth scroll to section on click
- [ ] Mobile sheet drawer implementation
- [ ] IntersectionObserver performance optimized
- [ ] Keyboard accessible (tab navigation)
- [ ] ARIA labels present

---

### Task 2.2: Blog Hero Component

**File: `src/components/blog/reader/BlogHero.tsx`**

```typescript
import { BlogPost } from '@/types/blog';
import { Clock, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface BlogHeroProps {
  post: BlogPost;
}

export function BlogHero({ post }: BlogHeroProps) {
  return (
    <section className="relative mb-12">
      {/* Cover Image (optional) */}
      {post.cover_image && (
        <div className="relative w-full h-[400px] mb-8 rounded-2xl overflow-hidden">
          <Image
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/50 to-transparent" />
        </div>
      )}

      {/* Hero Content */}
      <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#E6EDF3] mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Subtitle */}
        {post.summary && (
          <p className="text-xl text-[#E6EDF3]/80 mb-6 leading-relaxed">
            {post.summary}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-[#27C93F]/30">
              <AvatarImage src={post.author?.avatar_url} alt={post.author?.username} />
              <AvatarFallback className="bg-[#27C93F]/20 text-[#27C93F]">
                {post.author?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-[#E6EDF3]">
                {post.author?.username}
              </p>
              <div className="flex items-center gap-3 text-xs text-[#E6EDF3]/60">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {post.published_at && formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {post.reading_time_minutes} min read
                </span>
              </div>
            </div>
          </div>

          {/* Follow Button (optional) */}
          <button className="px-4 py-2 bg-[#27C93F] text-[#0d1117] rounded-lg font-medium hover:bg-[#27C93F]/90 transition-colors text-sm">
            Follow
          </button>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-[#27C93F]/10 text-[#27C93F] rounded-full text-xs font-medium border border-[#27C93F]/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders title, subtitle, author, meta
- [ ] Optional cover image with gradient overlay
- [ ] Tags displayed with terminal aesthetic
- [ ] Responsive layout (mobile/desktop)
- [ ] Follow button functional (if user logged in)
- [ ] Reading time displayed correctly

---

### Task 2.3: Blog Content Renderer

**File: `src/components/blog/reader/BlogContent.tsx`**

```typescript
'use client';

import { memo } from 'react';
import './blog-prose.css'; // Custom prose styles

interface BlogContentProps {
  html: string;
  className?: string;
}

export const BlogContent = memo(function BlogContent({ html, className }: BlogContentProps) {
  return (
    <article
      className={`
        blog-prose prose prose-invert prose-lg max-w-3xl mx-auto
        ${className || ''}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
```

**File: `src/components/blog/reader/blog-prose.css`**

```css
.blog-prose {
  --prose-body: #E6EDF3;
  --prose-headings: #E6EDF3;
  --prose-links: #27C93F;
  --prose-code: #27C93F;
  --prose-quotes: rgba(230, 237, 243, 0.8);
  --prose-code-bg: #161b22;
  --prose-border: rgba(255, 255, 255, 0.1);

  line-height: 1.8;
  color: var(--prose-body);
}

.blog-prose h1,
.blog-prose h2,
.blog-prose h3,
.blog-prose h4 {
  scroll-margin-top: 80px;
  color: var(--prose-headings);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.blog-prose h2 {
  margin-top: 2em;
  margin-bottom: 1em;
  padding-bottom: 0.5em;
  border-bottom: 1px solid var(--prose-border);
}

.blog-prose code {
  background: var(--prose-code-bg);
  color: var(--prose-code);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.blog-prose pre {
  background: #0d1117;
  border: 1px solid var(--prose-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  overflow-x: auto;
}

.blog-prose pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.875rem;
  line-height: 1.7;
}

.blog-prose blockquote {
  border-left: 2px solid rgba(39, 201, 63, 0.6);
  padding-left: 1rem;
  font-style: italic;
  color: var(--prose-quotes);
  background: rgba(39, 201, 63, 0.05);
  padding: 1rem 1rem 1rem 1.5rem;
  border-radius: 0.5rem;
  margin: 1.5rem 0;
}

.blog-prose a {
  color: var(--prose-links);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: all 0.2s;
}

.blog-prose a:hover {
  text-decoration-color: var(--prose-links);
  text-shadow: 0 0 8px rgba(39, 201, 63, 0.5);
}

.blog-prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.875rem;
}

.blog-prose th {
  background: #161b22;
  border: 1px solid var(--prose-border);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
}

.blog-prose td {
  border: 1px solid var(--prose-border);
  padding: 0.75rem 1rem;
}

.blog-prose img {
  border-radius: 0.75rem;
  margin: 2rem auto;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--prose-border);
}

.blog-prose ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.blog-prose ul[data-type="taskList"] li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.blog-prose ul[data-type="taskList"] input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: #27C93F;
  cursor: pointer;
}
```

**Acceptance Criteria:**
- [ ] Renders HTML from tiptap correctly
- [ ] All content types styled (code, tables, lists, etc.)
- [ ] Terminal aesthetic applied
- [ ] Responsive on all screen sizes
- [ ] Syntax highlighting works in code blocks
- [ ] Images load with lazy loading
- [ ] Smooth scroll to headings works

---

## Phase 3: Editor Canvas (Week 5-8)

### Task 3.1: Tiptap Configuration

**File: `src/lib/tiptap/extensions.ts`**

```typescript
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { lowlight } from 'lowlight';
import { CustomHeading } from './custom-heading';
import { Callout } from './callout-extension';

export const editorExtensions = [
  StarterKit.configure({
    heading: false, // Use custom heading
    codeBlock: false, // Use CodeBlockLowlight
  }),
  CustomHeading, // With ID injection
  Typography,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        return 'Heading...';
      }
      return 'Write something amazing...';
    },
  }),
  CharacterCount,
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'typescript',
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'blog-table',
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'blog-image',
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'blog-link',
    },
  }),
  Callout, // Custom extension
];
```

**File: `src/lib/tiptap/custom-heading.ts`**

```typescript
import Heading from '@tiptap/extension-heading';
import { mergeAttributes } from '@tiptap/core';

export const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level)
      ? node.attrs.level
      : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-heading-level': level,
      }),
      0,
    ];
  },
});
```

**File: `src/lib/tiptap/callout-extension.ts`**

```typescript
import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: { type?: 'info' | 'warning' | 'danger' }) => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({
          'data-type': attributes.type,
          class: `callout callout-${attributes.type}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        attributes =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
    };
  },
});
```

**Acceptance Criteria:**
- [ ] All extensions configured correctly
- [ ] Custom heading with ID support
- [ ] Callout extension working
- [ ] Slash commands functional
- [ ] Character count tracking
- [ ] Placeholder text shows correctly

---

### Task 3.2: Blog Editor Canvas Component

**File: `src/components/blog/editor/BlogEditorCanvas.tsx`**

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useState, useEffect, useCallback } from 'react';
import { editorExtensions } from '@/lib/tiptap/extensions';
import { BlogEditorState, BlogPost } from '@/types/blog';
import { EditorToolbar } from './EditorToolbar';
import { EditorTOC } from './EditorTOC';
import { PostMetaPanel } from './PostMetaPanel';
import { TOCGenerator } from '@/utils/blog/toc-generator';
import { useDebounce } from '@/hooks/useDebounce';
import { Save } from 'lucide-react';
import './editor-styles.css';

interface BlogEditorCanvasProps {
  initialPost?: Partial<BlogPost>;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
  onPublish: (post: Partial<BlogPost>) => Promise<void>;
}

export function BlogEditorCanvas({
  initialPost,
  onSave,
  onPublish,
}: BlogEditorCanvasProps) {
  const [editorState, setEditorState] = useState<BlogEditorState>({
    post: initialPost || {},
    isSaving: false,
    hasUnsavedChanges: false,
  });

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialPost?.content_json || {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Untitled Post' }],
        },
      ],
    },
    editorProps: {
      attributes: {
        class: 'blog-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      setEditorState(prev => ({
        ...prev,
        hasUnsavedChanges: true,
        post: {
          ...prev.post,
          content_json: editor.getJSON(),
        },
      }));
    },
  });

  // Auto-save with debounce
  const debouncedContent = useDebounce(editorState.post.content_json, 2000);

  useEffect(() => {
    if (debouncedContent && editorState.hasUnsavedChanges) {
      handleAutoSave();
    }
  }, [debouncedContent]);

  const handleAutoSave = async () => {
    if (!editor) return;

    setEditorState(prev => ({ ...prev, isSaving: true }));

    try {
      const generator = new TOCGenerator();
      const toc = generator.extractFromJSON(editor.getJSON());
      const wordCount = generator['extractWordCount'](editor.getJSON());
      const readingTime = generator['calculateReadingTime'](wordCount);

      const updatedPost: Partial<BlogPost> = {
        ...editorState.post,
        content_json: editor.getJSON(),
        toc_data: toc,
        word_count: wordCount,
        reading_time_minutes: readingTime,
      };

      await onSave(updatedPost);

      setEditorState(prev => ({
        ...prev,
        post: updatedPost,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      console.error('Auto-save failed:', error);
      setEditorState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handlePublish = async () => {
    if (!editor) return;

    try {
      await handleAutoSave();
      await onPublish(editorState.post);
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-[#161b22]/95 backdrop-blur-md border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[#E6EDF3]">Blog Editor</h1>
            {editorState.isSaving && (
              <span className="text-sm text-[#E6EDF3]/60 flex items-center gap-2">
                <Save size={14} className="animate-pulse" />
                Saving...
              </span>
            )}
            {editorState.lastSaved && !editorState.isSaving && (
              <span className="text-sm text-[#E6EDF3]/60">
                Saved {new Date(editorState.lastSaved).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#E6EDF3]/60">
              {editor.storage.characterCount.words()} words
            </span>
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-[#27C93F] text-[#0d1117] rounded-lg font-medium hover:bg-[#27C93F]/90 transition-colors"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="max-w-[1800px] mx-auto grid grid-cols-[280px_1fr_320px] gap-6 p-6">
        {/* Left: Live TOC */}
        <EditorTOC editor={editor} />

        {/* Center: Editor */}
        <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <EditorToolbar editor={editor} />
          <div className="p-8">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right: Metadata */}
        <PostMetaPanel
          post={editorState.post}
          onChange={post =>
            setEditorState(prev => ({
              ...prev,
              post: { ...prev.post, ...post },
              hasUnsavedChanges: true,
            }))
          }
        />
      </div>
    </div>
  );
}
```

**File: `src/components/blog/editor/editor-styles.css`**

```css
.blog-editor-content {
  min-height: 600px;
  outline: none;
  color: #E6EDF3;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.8;
}

.blog-editor-content h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #E6EDF3;
}

.blog-editor-content h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #E6EDF3;
}

.blog-editor-content h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #E6EDF3;
}

.blog-editor-content code {
  background: #0d1117;
  color: #27C93F;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.blog-editor-content pre {
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.5rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.blog-editor-content pre code {
  background: transparent;
  padding: 0;
  font-size: 0.875rem;
  line-height: 1.7;
}

.blog-editor-content blockquote {
  border-left: 2px solid rgba(39, 201, 63, 0.6);
  padding-left: 1rem;
  font-style: italic;
  color: rgba(230, 237, 243, 0.8);
  background: rgba(39, 201, 63, 0.05);
  padding: 1rem 1rem 1rem 1.5rem;
  border-radius: 0.5rem;
  margin: 1.5rem 0;
}

.blog-editor-content .callout {
  padding: 1rem;
  border-radius: 0.75rem;
  margin: 1.5rem 0;
  border-left: 3px solid;
}

.blog-editor-content .callout-info {
  background: rgba(58, 120, 255, 0.1);
  border-color: rgba(58, 120, 255, 0.6);
}

.blog-editor-content .callout-warning {
  background: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.6);
}

.blog-editor-content .callout-danger {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.6);
}

.blog-editor-content .is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: rgba(230, 237, 243, 0.3);
  pointer-events: none;
  height: 0;
}
```

**Acceptance Criteria:**
- [ ] Three-column layout renders correctly
- [ ] Tiptap editor functional with all extensions
- [ ] Auto-save triggers after 2s of inactivity
- [ ] Word count updates in real-time
- [ ] TOC updates as headings change
- [ ] Publish button saves and publishes
- [ ] Editor matches reader styling (WYSIWYG)

---

### Task 3.3: Editor Toolbar

**File: `src/components/blog/editor/EditorToolbar.tsx`**

```typescript
'use client';

import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Table,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  AlertCircle,
  CheckSquare,
  Minus,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const ToolbarButton = ({
    icon: Icon,
    onClick,
    isActive = false,
    title,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    isActive?: boolean;
    title: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'p-2 rounded-md transition-colors',
        'hover:bg-white/5',
        isActive && 'bg-[#27C93F]/20 text-[#27C93F]',
        !isActive && 'text-[#E6EDF3]/70'
      )}
      title={title}
      type="button"
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex items-center gap-1 p-3 border-b border-white/10 flex-wrap">
      {/* Text Formatting */}
      <ToolbarButton
        icon={Bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      />
      <ToolbarButton
        icon={Italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      />
      <ToolbarButton
        icon={Strikethrough}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      />
      <ToolbarButton
        icon={Code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      />

      <Separator orientation="vertical" className="h-6 bg-white/10" />

      {/* Headings */}
      <ToolbarButton
        icon={Heading1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      />
      <ToolbarButton
        icon={Heading2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      />
      <ToolbarButton
        icon={Heading3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      />

      <Separator orientation="vertical" className="h-6 bg-white/10" />

      {/* Lists */}
      <ToolbarButton
        icon={List}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      />
      <ToolbarButton
        icon={ListOrdered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      />
      <ToolbarButton
        icon={CheckSquare}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        title="Task List"
      />

      <Separator orientation="vertical" className="h-6 bg-white/10" />

      {/* Blocks */}
      <ToolbarButton
        icon={Quote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      />
      <ToolbarButton
        icon={Code2}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      />
      <ToolbarButton
        icon={AlertCircle}
        onClick={() => editor.chain().focus().setCallout({ type: 'info' }).run()}
        isActive={editor.isActive('callout')}
        title="Callout"
      />

      <Separator orientation="vertical" className="h-6 bg-white/10" />

      {/* Media & Links */}
      <ToolbarButton
        icon={LinkIcon}
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        isActive={editor.isActive('link')}
        title="Insert Link"
      />
      <ToolbarButton
        icon={ImageIcon}
        onClick={() => {
          const url = window.prompt('Enter image URL:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        title="Insert Image"
      />
      <ToolbarButton
        icon={Table}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        isActive={editor.isActive('table')}
        title="Insert Table"
      />
      <ToolbarButton
        icon={Minus}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] All toolbar buttons functional
- [ ] Active state shows correctly
- [ ] Keyboard shortcuts work
- [ ] Icons render correctly
- [ ] Responsive layout
- [ ] Tooltips show on hover

---

## Phase 4: Integration & Polish (Week 9-12)

### Task 4.1: Blog Reader Page Route

**File: `src/app/blog/[slug]/page.tsx`**

```typescript
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BlogHero } from '@/components/blog/reader/BlogHero';
import { BlogContent } from '@/components/blog/reader/BlogContent';
import { FloatingTOC } from '@/components/blog/toc/FloatingTOC';
import { EngagementBar } from '@/components/blog/reader/EngagementBar';
import { CommentsPanel } from '@/components/blog/reader/CommentsPanel';
import { BlogPost } from '@/types/blog';

interface BlogPageProps {
  params: { slug: string };
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        avatar_url,
        bio
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;

  return data as BlogPost;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.summary,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.summary,
      images: post.og_image ? [{ url: post.og_image }] : [],
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author?.username || 'Anonymous'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.summary,
      images: post.og_image ? [post.og_image] : [],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BlogHero post={post} />

        <div className="grid grid-cols-[280px_1fr] gap-8">
          {/* Left: Floating TOC */}
          <FloatingTOC items={post.toc_data} />

          {/* Center: Content */}
          <div>
            <BlogContent html={post.content_html} />
            <EngagementBar postId={post.id} />
          </div>
        </div>

        {/* Comments Panel */}
        <CommentsPanel postId={post.id} />
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Page renders with all components
- [ ] SEO metadata generated correctly
- [ ] TOC floats on left side (sticky)
- [ ] Content centered and readable
- [ ] Engagement bar functional
- [ ] Comments panel accessible
- [ ] Lighthouse score > 90

---

## Testing Strategy

### Unit Tests

**File: `src/tests/blog/toc-generator.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { TOCGenerator } from '@/utils/blog/toc-generator';

describe('TOCGenerator', () => {
  it('should generate unique slugs for headings', () => {
    const generator = new TOCGenerator();
    const slug1 = generator.generateSlug('Hello World');
    const slug2 = generator.generateSlug('Hello World');

    expect(slug1).toBe('hello-world');
    expect(slug2).toBe('hello-world-1');
  });

  it('should handle empty heading text', () => {
    const generator = new TOCGenerator();
    const slug = generator.generateSlug('');

    expect(slug).toBe('heading');
  });

  it('should handle international characters', () => {
    const generator = new TOCGenerator();
    const slug = generator.generateSlug('你好世界');

    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('should extract TOC from tiptap JSON', () => {
    const generator = new TOCGenerator();
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Overview' }],
        },
      ],
    };

    const toc = generator.extractFromJSON(content);

    expect(toc).toHaveLength(1);
    expect(toc[0].text).toBe('Introduction');
    expect(toc[0].children).toHaveLength(1);
    expect(toc[0].children[0].text).toBe('Overview');
  });
});
```

### E2E Tests

**File: `src/tests/e2e/blog-reader.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Blog Reader', () => {
  test('should navigate to section on TOC click', async ({ page }) => {
    await page.goto('/blog/test-post');

    // Wait for TOC to load
    await page.waitForSelector('[aria-label="Table of contents"]');

    // Click TOC item
    await page.click('text=Introduction');

    // Verify URL updated
    expect(page.url()).toContain('#introduction');

    // Verify scrolled to section
    const heading = await page.locator('h2#introduction');
    await expect(heading).toBeInViewport();
  });

  test('should highlight active section on scroll', async ({ page }) => {
    await page.goto('/blog/test-post');

    // Scroll to middle
    await page.evaluate(() => {
      document.querySelector('#methodology')?.scrollIntoView();
    });

    // Wait for active state
    await page.waitForTimeout(500);

    // Check active item
    const activeItem = await page.locator('[aria-current="location"]');
    await expect(activeItem).toContainText('Methodology');
  });

  test('should open comments panel', async ({ page }) => {
    await page.goto('/blog/test-post');

    // Click engagement bar comment button
    await page.click('text=Comments');

    // Verify panel opened
    const panel = await page.locator('[role="dialog"]');
    await expect(panel).toBeVisible();
  });
});
```

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] TypeScript checks passing
- [ ] Lighthouse score > 90
- [ ] Database migrations tested on staging
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Performance benchmarks met

### Deployment Steps

1. **Database Migration** (30 min)
   ```bash
   # Run on staging first
   npm run db:migrate:staging

   # Verify migration
   npm run db:verify:staging

   # Run on production
   npm run db:migrate:production
   ```

2. **Deploy Application** (20 min)
   ```bash
   # Build production bundle
   npm run build

   # Deploy via Dokploy
   git push dokploy main

   # Monitor deployment
   dokploy logs -f
   ```

3. **Post-Deployment Verification** (15 min)
   - [ ] Homepage loads
   - [ ] Blog listing page loads
   - [ ] Individual blog post loads
   - [ ] TOC navigation works
   - [ ] Editor accessible (admin only)
   - [ ] Comments functional
   - [ ] No console errors

### Rollback Procedure

If issues detected:

1. **Revert deployment**
   ```bash
   dokploy rollback previous
   ```

2. **Revert database** (if needed)
   ```bash
   npm run db:rollback:production
   ```

3. **Verify rollback**
   - Test critical paths
   - Check error rates
   - Monitor user reports

---

## Success Metrics

### Technical Metrics
- ✅ TOC generation time < 50ms
- ✅ Page load time < 2s
- ✅ Lighthouse performance > 90
- ✅ Lighthouse accessibility > 95
- ✅ Zero TypeScript errors
- ✅ Test coverage > 80%

### User Metrics
- ✅ TOC usage rate > 60%
- ✅ Average reading depth > 70%
- ✅ Blog engagement rate > 40%
- ✅ Editor usage (staff) > 90%
- ✅ User satisfaction > 4.5/5

---

## Timeline Summary

**Week 1-2**: Foundation (Types, TOC utils, HTML renderer)
**Week 3-4**: Reader (TOC component, Hero, Content, Engagement)
**Week 5-8**: Editor (Tiptap setup, Canvas, Toolbar, Metadata)
**Week 9-10**: Integration (Routes, API, Testing)
**Week 11**: Polish & Performance
**Week 12**: Deployment & Monitoring

**Total: 12 weeks**

---

## Next Steps

1. **Environment Setup** (Day 1)
   - Install dependencies
   - Run database migrations
   - Create directory structure

2. **Start Phase 1** (Week 1)
   - Implement types
   - Build TOC generator
   - Test TOC utilities

3. **Weekly Check-ins**
   - Monday: Sprint planning
   - Wednesday: Mid-week sync
   - Friday: Demo & retrospective

4. **Daily Standups**
   - What did you do yesterday?
   - What will you do today?
   - Any blockers?

---

## Support & Resources

**Documentation:**
- [tiptap Docs](https://tiptap.dev)
- [Radix UI Docs](https://www.radix-ui.com)
- [Tailwind v4 Docs](https://tailwindcss.com)

**Team Contacts:**
- Frontend Lead: [Name]
- Backend Lead: [Name]
- Design: [Name]
- DevOps: [Name]

**Tools:**
- Project Management: Linear / GitHub Projects
- Design: Figma
- Communication: Slack / Discord
- CI/CD: GitHub Actions + Dokploy

---

This UPDATE.md serves as your **single source of truth** for executing the blog enhancement plan. Follow the phases sequentially, check off acceptance criteria, and maintain the timeline. Good luck! 🚀