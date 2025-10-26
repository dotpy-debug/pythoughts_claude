/**
 * Blog-specific TypeScript types and interfaces
 *
 * This module defines all types for the enhanced blog system including:
 * - BlogPost: Complete blog post structure with tiptap content
 * - TOCItem: Table of contents hierarchy
 * - BlogAuthor: Author information
 * - BlogEditorState: Editor state management
 */

import { JSONContent } from '@tiptap/react';

/**
 * Complete blog post interface
 * Extends the base Post type with blog-specific fields
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content_json: JSONContent; // tiptap document (canonical source)
  content_html: string; // pre-rendered HTML for reading
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

  // SEO metadata
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical_url?: string;

  // Series support
  series_id?: string;
  series_order?: number;

  // Timestamps
  published_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Table of contents item
 * Supports nested hierarchy (h2 > h3 > h4)
 */
export interface TOCItem {
  id: string; // Unique heading ID (slug)
  text: string; // Heading text content
  level: number; // 1-6 for h1-h6 (typically 2-4 in TOC)
  children?: TOCItem[]; // Nested child headings
}

/**
 * Blog author information
 */
export interface BlogAuthor {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  follower_count?: number;
}

/**
 * Blog editor state
 * Tracks editor content and save status
 */
export interface BlogEditorState {
  post: Partial<BlogPost>;
  isSaving: boolean;
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
}

/**
 * Blog series
 */
export interface BlogSeries {
  id: string;
  title: string;
  slug: string;
  description?: string;
  cover_image?: string;
  author_id: string;
  post_count: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Reading progress tracking
 */
export interface ReadingProgress {
  id: string;
  user_id: string;
  post_id: string;
  progress_percentage: number;
  last_position?: string; // heading ID
  reading_time_seconds: number;
  completed: boolean;
  updated_at: string;
}

/**
 * TOC interaction analytics
 */
export interface TOCInteraction {
  id: string;
  post_id: string;
  user_id?: string;
  heading_id: string;
  action: 'click' | 'view' | 'scroll_past';
  timestamp: string;
  session_id?: string;
}

/**
 * Blog comment with threading support
 */
export interface BlogComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  reaction_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;

  // Populated fields
  user?: BlogAuthor;
  replies?: BlogComment[];
}
