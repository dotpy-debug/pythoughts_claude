/**
 * Markdown Import/Export Utilities
 *
 * Handle markdown file operations
 * Features:
 * - Export markdown to .md file
 * - Import/read .md files
 * - Frontmatter handling
 * - File name sanitization
 */

import { addFrontmatter, parseMarkdownWithFrontmatter, type PostMetadata } from './markdown-converter';

/**
 * Export options
 */
export interface ExportOptions {
  /**
   * File name (without extension)
   */
  filename?: string;

  /**
   * Include frontmatter
   * @default true
   */
  includeFrontmatter?: boolean;

  /**
   * Post metadata for frontmatter
   */
  metadata?: PostMetadata;
}

/**
 * Import result
 */
export interface ImportResult {
  /**
   * Markdown content (without frontmatter)
   */
  content: string;

  /**
   * Metadata from frontmatter
   */
  metadata: PostMetadata;

  /**
   * Original filename
   */
  filename: string;
}

/**
 * Download markdown as .md file
 */
export function downloadMarkdown(markdown: string, options: ExportOptions = {}): void {
  const {
    filename = 'post',
    includeFrontmatter = true,
    metadata = {},
  } = options;

  // Add frontmatter if requested and metadata exists
  let content = markdown;
  if (includeFrontmatter && Object.keys(metadata).length > 0) {
    content = addFrontmatter(markdown, metadata);
  }

  // Create blob
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename) + '.md';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read markdown file
 */
export function readMarkdownFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (!text) {
          reject(new Error('Empty file'));
          return;
        }

        const { content, metadata } = parseMarkdownWithFrontmatter(text);

        resolve({
          content,
          metadata,
          filename: file.name,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import markdown from file input
 */
export async function importMarkdown(fileInput: HTMLInputElement): Promise<ImportResult | null> {
  const files = fileInput.files;

  if (!files || files.length === 0) {
    return null;
  }

  const file = files[0];

  // Validate file type
  if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
    throw new Error('Invalid file type. Please select a .md or .markdown file.');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }

  return readMarkdownFile(file);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-]/gi, '_') // Replace invalid characters
    .replace(/_{2,}/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
    .substring(0, 100) || 'post'; // Max length 100, default to 'post'
}

/**
 * Generate filename from post title
 */
export function generateFilename(title: string, date?: Date): string {
  const sanitized = sanitizeFilename(title);
  const dateStr = date ? formatDate(date) : formatDate(new Date());

  return `${dateStr}_${sanitized}`;
}

/**
 * Format date for filename (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Copy markdown to clipboard
 */
export async function copyMarkdownToClipboard(markdown: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(markdown);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Read markdown from clipboard
 */
export async function readMarkdownFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    throw new Error('Failed to read from clipboard. Please grant clipboard access.');
  }
}

/**
 * Export post metadata as JSON
 */
export function downloadMetadata(metadata: PostMetadata, filename: string = 'metadata'): void {
  const json = JSON.stringify(metadata, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = sanitizeFilename(filename) + '.json';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Batch export multiple posts
 */
export function downloadMultipleMarkdown(
  posts: Array<{ content: string; metadata: PostMetadata }>,
  zipFilename: string = 'posts'
): void {
  // Note: This is a simple implementation that downloads files one by one
  // For true ZIP support, you'd need to add a library like JSZip

  posts.forEach((post, index) => {
    const filename = post.metadata.title
      ? generateFilename(post.metadata.title)
      : `post_${index + 1}`;

    // Small delay between downloads to prevent browser blocking
    setTimeout(() => {
      downloadMarkdown(post.content, {
        filename,
        includeFrontmatter: true,
        metadata: post.metadata,
      });
    }, index * 100);
  });
}

/**
 * Validate markdown file
 */
export function validateMarkdownFile(file: File): { valid: boolean; error?: string } {
  // Check file extension
  if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
    return {
      valid: false,
      error: 'Invalid file type. Please select a .md or .markdown file.',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty.',
    };
  }

  return { valid: true };
}
