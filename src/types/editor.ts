/**
 * Editor Type Definitions
 *
 * Type-safe interfaces for Tiptap editor, extensions, and collaboration features.
 */

import type { Editor as TiptapEditor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';

/**
 * Editor content format
 */
export type EditorContentFormat = 'html' | 'json' | 'markdown' | 'text';

/**
 * Tiptap editor instance (re-export for convenience)
 */
export type Editor = TiptapEditor;

/**
 * Editor content (re-export for convenience)
 */
export type EditorContent = JSONContent;

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Heading level
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Editor toolbar button
 */
export interface EditorToolbarButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  shortcut?: string;
}

/**
 * Editor toolbar group
 */
export interface EditorToolbarGroup {
  id: string;
  buttons: EditorToolbarButton[];
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
  url: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

/**
 * Video embed data
 */
export interface VideoEmbedData {
  url: string;
  provider: 'youtube' | 'vimeo' | 'other';
  embedUrl?: string;
  thumbnail?: string;
  title?: string;
  duration?: number;
}

/**
 * Code block language
 */
export type CodeBlockLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'html'
  | 'css'
  | 'scss'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'bash'
  | 'sql'
  | 'plaintext';

/**
 * Link attributes
 */
export interface LinkAttributes {
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  title?: string;
}

/**
 * Table cell attributes
 */
export interface TableCellAttributes {
  colspan?: number;
  rowspan?: number;
  colwidth?: number[];
  background?: string;
}

/**
 * Collaboration user presence
 */
export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    from: number;
    to: number;
  };
}

/**
 * Collaboration awareness state
 */
export interface CollaborationAwareness {
  users: CollaborationUser[];
  localUser: CollaborationUser;
}

/**
 * Editor mention suggestion
 */
export interface MentionSuggestion {
  id: string;
  label: string;
  avatar?: string;
  subtitle?: string;
}

/**
 * Editor emoji suggestion
 */
export interface EmojiSuggestion {
  emoji: string;
  name: string;
  aliases: string[];
  tags: string[];
}

/**
 * Slash command suggestion
 */
export interface SlashCommandSuggestion {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  action: (editor: Editor) => void;
}

/**
 * Editor statistics
 */
export interface EditorStatistics {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
}

/**
 * Auto-save state
 */
export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  id: string;
  content: JSONContent;
  timestamp: Date;
  author: {
    id: string;
    name: string;
  };
  changeSummary?: string;
}

/**
 * AI writing suggestion
 */
export interface AIWritingSuggestion {
  id: string;
  type: 'grammar' | 'style' | 'clarity' | 'tone' | 'completion';
  message: string;
  original: string;
  suggestion: string;
  confidence: number;
  position: {
    from: number;
    to: number;
  };
}

/**
 * Pexels image search result
 */
export interface PexelsImage {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

/**
 * Media library item
 */
export interface MediaLibraryItem {
  id: string;
  url: string;
  thumbnail: string;
  type: 'image' | 'video' | 'audio' | 'document';
  filename: string;
  size: number;
  mimeType: string;
  alt?: string;
  caption?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  uploadedAt: Date;
}

/**
 * Editor theme
 */
export type EditorTheme = 'default' | 'minimal' | 'focus' | 'typewriter';

/**
 * Editor mode
 */
export type EditorMode = 'edit' | 'preview' | 'split';

/**
 * Table of contents item
 */
export interface TableOfContentsItem {
  id: string;
  level: HeadingLevel;
  text: string;
  slug: string;
  children?: TableOfContentsItem[];
}

/**
 * Comment thread
 */
export interface CommentThread {
  id: string;
  position: {
    from: number;
    to: number;
  };
  comments: Array<{
    id: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: Date;
  }>;
  resolved: boolean;
}
