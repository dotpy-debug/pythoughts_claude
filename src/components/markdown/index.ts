/**
 * Markdown Components and Utilities
 *
 * Centralized exports for all markdown-related functionality
 */

// Components
export { EditorModeToggle, CompactEditorModeToggle } from './EditorModeToggle';
export type { EditorMode } from './EditorModeToggle';

export { MarkdownTextarea } from './MarkdownTextarea';

// Markdown Conversion
export {
  tiptapToMarkdown,
  markdownToTipTap,
  parseMarkdownWithFrontmatter,
  addFrontmatter,
  tiptapToMarkdownWithMeta,
  markdownWithMetaToTipTap,
} from '../../lib/markdown-converter';

export type { PostMetadata, MarkdownWithMeta } from '../../lib/markdown-converter';

// Import/Export
export {
  downloadMarkdown,
  readMarkdownFile,
  importMarkdown,
  sanitizeFilename,
  generateFilename,
  copyMarkdownToClipboard,
  readMarkdownFromClipboard,
  downloadMetadata,
  downloadMultipleMarkdown,
  validateMarkdownFile,
} from '../../lib/markdown-import-export';

export type {
  ExportOptions,
  ImportResult,
} from '../../lib/markdown-import-export';
