/**
 * Markdown Converter
 *
 * Bidirectional conversion between TipTap JSON and Markdown
 * Features:
 * - TipTap JSON → Markdown serialization
 * - Markdown → TipTap JSON parsing
 * - GitHub Flavored Markdown support
 * - Custom video embed syntax {{youtube:ID}}, {{vimeo:ID}}
 * - Image support with alt text
 * - Tables, task lists, strikethrough
 * - Code blocks with syntax highlighting
 * - Frontmatter (YAML) support
 */

import matter from 'gray-matter';
import type { JSONContent } from '@tiptap/core';

/**
 * Post metadata from frontmatter
 */
export interface PostMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  date?: string;
  author?: string;
  image?: string;
  [key: string]: unknown;
}

/**
 * Markdown with frontmatter
 */
export interface MarkdownWithMeta {
  content: string;
  metadata: PostMetadata;
}

/**
 * Convert TipTap JSON to Markdown
 */
export function tiptapToMarkdown(json: JSONContent): string {
  if (!json) return '';

  return serializeNode(json);
}

/**
 * Serialize a single TipTap node to Markdown
 */
function serializeNode(node: JSONContent, context: { listLevel?: number } = {}): string {
  if (!node) return '';

  const { type, content, marks, attrs, text } = node;

  // Handle text nodes with marks
  if (type === 'text' && text !== undefined) {
    return applyMarks(text, marks || []);
  }

  // Handle different node types
  switch (type) {
    case 'doc': {
      return serializeChildren(content);
    }

    case 'paragraph': {
      return serializeChildren(content) + '\n\n';
    }

    case 'heading': {
      const level = attrs?.level || 1;
      return '#'.repeat(level) + ' ' + serializeChildren(content) + '\n\n';
    }
    case 'blockquote': {
      return serializeChildren(content)
        .split('\n')
        .map(line => line ? `> ${line}` : '>')
        .join('\n') + '\n\n';
    }

    case 'codeBlock': {
      const language = attrs?.language || '';
      const code = serializeChildren(content);
      return '```' + language + '\n' + code + '\n```\n\n';
    }
    case 'bulletList': {
      return serializeList(content, '- ', context.listLevel) + '\n';
    }

    case 'orderedList': {
      return serializeList(content, '1. ', context.listLevel) + '\n';
    }

    case 'listItem': {
      return serializeChildren(content);
    }

    case 'taskList': {
      return serializeTaskList(content) + '\n';
    }

    case 'taskItem': {
      const checked = attrs?.checked ? '[x]' : '[ ]';
      return checked + ' ' + serializeChildren(content);
    }
    case 'horizontalRule': {
      return '---\n\n';
    }

    case 'hardBreak': {
      return '  \n';
    }

    case 'image': {
      const alt = attrs?.alt || '';
      const source = attrs?.src || '';
      const title = attrs?.title || '';
      return title ? `![${alt}](${source} "${title}")` : `![${alt}](${source})`;
    }
    case 'youtube': {
      const youtubeId = attrs?.videoId || extractYouTubeId(attrs?.src);
      return `{{youtube:${youtubeId}}}\n\n`;
    }
    case 'vimeo': {
      const vimeoId = attrs?.videoId || '';
      return `{{vimeo:${vimeoId}}}\n\n`;
    }
    case 'table': {
      return serializeTable(content) + '\n';
    }

    case 'tableRow': {
      return '| ' + serializeChildren(content) + '\n';
    }

    case 'tableHeader':
    case 'tableCell': {
      return serializeChildren(content) + ' | ';
    }

    default: {
      // Unknown node type, try to serialize children
      return serializeChildren(content);
    }
  }
}

/**
 * Serialize children nodes
 */
function serializeChildren(content?: JSONContent[]): string {
  if (!content || !Array.isArray(content)) return '';
  return content.map(node => serializeNode(node)).join('');
}

/**
 * Apply text marks (bold, italic, code, etc.)
 */
function applyMarks(text: string, marks: Array<{ type: string; attrs?: Record<string, unknown> }>): string {
  if (!marks || marks.length === 0) return text;

  let result = text;

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold': {
        result = `**${result}**`;
        break;
      }
      case 'italic': {
        result = `*${result}*`;
        break;
      }
      case 'code': {
        result = `\`${result}\``;
        break;
      }
      case 'strike': {
        result = `~~${result}~~`;
        break;
      }
      case 'link': {
        const href = (mark.attrs?.href as string) || '';
        const title = mark.attrs?.title as string | undefined;
        result = title ? `[${result}](${href} "${title}")` : `[${result}](${href})`;
        break;
      }
      case 'highlight': {
        result = `==${result}==`;
        break;
      }
    }
  }

  return result;
}

/**
 * Serialize list with indentation
 */
function serializeList(content: JSONContent[] | undefined, marker: string, level: number = 0): string {
  if (!content) return '';

  const indent = '  '.repeat(level);

  return content
    .map((item, index) => {
      const itemMarker = marker.includes('1.') ? `${index + 1}. ` : marker;
      const itemContent = serializeNode(item, { listLevel: level + 1 });
      return indent + itemMarker + itemContent.trim();
    })
    .join('\n');
}

/**
 * Serialize task list
 */
function serializeTaskList(content: JSONContent[] | undefined): string {
  if (!content) return '';

  return content
    .map(item => serializeNode(item))
    .join('\n');
}

/**
 * Serialize table to GFM format
 */
function serializeTable(content: JSONContent[] | undefined): string {
  if (!content || content.length === 0) return '';

  const rows = content.map(row => serializeNode(row)).filter(Boolean);

  if (rows.length === 0) return '';

  // Add header separator after first row
  if (rows.length > 0) {
    const headerRow = rows[0];
    const columnCount = (headerRow.match(/\|/g) || []).length - 1;
    const separator = '| ' + new Array(columnCount).fill('---').join(' | ') + ' |\n';
    rows.splice(1, 0, separator);
  }

  return rows.join('');
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeId(url: string = ''): string {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

/**
 * Convert Markdown to TipTap JSON
 */
export function markdownToTipTap(markdown: string): JSONContent {
  // Parse markdown to AST
  const lines = markdown.split('\n');
  const nodes: JSONContent[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    // Skip empty lines
    if (!line.trim()) {
      index++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: [{ type: 'text', text: headingMatch[2] }],
      });
      index++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push({ type: 'horizontalRule' });
      index++;
      continue;
    }

    // Code block
    const codeBlockMatch = line.match(/^```(\w*)$/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || '';
      const codeLines: string[] = [];
      index++;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }

      nodes.push({
        type: 'codeBlock',
        attrs: language ? { language } : {},
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      index++; // Skip closing ```
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quoteLines.push(lines[index].slice(2));
        index++;
      }

      nodes.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: parseInlineContent(quoteLines.join('\n')),
          },
        ],
      });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const listItems: JSONContent[] = [];

      while (index < lines.length && /^[-*+]\s/.test(lines[index])) {
        const itemText = lines[index].replace(/^[-*+]\s/, '');
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineContent(itemText),
            },
          ],
        });
        index++;
      }

      nodes.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: JSONContent[] = [];

      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        const itemText = lines[index].replace(/^\d+\.\s/, '');
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineContent(itemText),
            },
          ],
        });
        index++;
      }

      nodes.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // Task list
    if (/^[-*]\s\[(x|\s)\]\s/i.test(line)) {
      const taskItems: JSONContent[] = [];

      while (index < lines.length && /^[-*]\s\[(x|\s)\]\s/i.test(lines[index])) {
        const checked = /\[x\]/i.test(lines[index]);
        const itemText = lines[index].replace(/^[-*]\s\[(x|\s)\]\s/i, '');

        taskItems.push({
          type: 'taskItem',
          attrs: { checked },
          content: [
            {
              type: 'paragraph',
              content: parseInlineContent(itemText),
            },
          ],
        });
        index++;
      }

      nodes.push({
        type: 'taskList',
        content: taskItems,
      });
      continue;
    }

    // Custom video embed syntax: {{youtube:VIDEO_ID}} or {{vimeo:VIDEO_ID}}
    const videoMatch = line.match(/^\{\{(youtube|vimeo):([a-zA-Z0-9_-]+)\}\}$/);
    if (videoMatch) {
      const platform = videoMatch[1];
      const videoId = videoMatch[2];

      nodes.push({
        type: platform,
        attrs: {
          videoId,
          src: platform === 'youtube'
            ? `https://www.youtube.com/watch?v=${videoId}`
            : `https://vimeo.com/${videoId}`,
        },
      });
      index++;
      continue;
    }

    // Image: ![alt](url) or ![alt](url "title")
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)$/);
    if (imageMatch) {
      nodes.push({
        type: 'image',
        attrs: {
          src: imageMatch[2],
          alt: imageMatch[1] || '',
          title: imageMatch[3] || '',
        },
      });
      index++;
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim() && !isSpecialLine(lines[index])) {
      paragraphLines.push(lines[index]);
      index++;
    }

    if (paragraphLines.length > 0) {
      nodes.push({
        type: 'paragraph',
        content: parseInlineContent(paragraphLines.join('\n')),
      });
    }
  }

  return {
    type: 'doc',
    content: nodes,
  };
}

/**
 * Check if line starts a special block
 */
function isSpecialLine(line: string): boolean {
  return (
    /^#{1,6}\s/.test(line) ||
    line.startsWith('```') ||
    line.startsWith('> ') ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    /^[-*]\s\[/.test(line) ||
    /^\{\{(youtube|vimeo):/.test(line) ||
    /^!\[/.test(line) ||
    /^[-*_]{3,}$/.test(line)
  );
}

/**
 * Parse inline content (text with marks)
 */
function parseInlineContent(text: string): JSONContent[] {
  const nodes: JSONContent[] = [];
  let currentText = '';
  let index = 0;

  while (index < text.length) {
    // Bold: **text** or __text__
    if ((text[index] === '*' && text[index + 1] === '*') || (text[index] === '_' && text[index + 1] === '_')) {
      if (currentText) {
        nodes.push({ type: 'text', text: currentText });
        currentText = '';
      }

      const delimiter = text.substring(index, index + 2);
      const endIndex = text.indexOf(delimiter, index + 2);

      if (endIndex !== -1) {
        const boldText = text.substring(index + 2, endIndex);
        nodes.push({
          type: 'text',
          text: boldText,
          marks: [{ type: 'bold' }],
        });
        index = endIndex + 2;
        continue;
      }
    }

    // Italic: *text* or _text_
    if (text[index] === '*' || text[index] === '_') {
      if (currentText) {
        nodes.push({ type: 'text', text: currentText });
        currentText = '';
      }

      const delimiter = text[index];
      const endIndex = text.indexOf(delimiter, index + 1);

      if (endIndex !== -1) {
        const italicText = text.substring(index + 1, endIndex);
        nodes.push({
          type: 'text',
          text: italicText,
          marks: [{ type: 'italic' }],
        });
        index = endIndex + 1;
        continue;
      }
    }

    // Code: `text`
    if (text[index] === '`') {
      if (currentText) {
        nodes.push({ type: 'text', text: currentText });
        currentText = '';
      }

      const endIndex = text.indexOf('`', index + 1);

      if (endIndex !== -1) {
        const codeText = text.substring(index + 1, endIndex);
        nodes.push({
          type: 'text',
          text: codeText,
          marks: [{ type: 'code' }],
        });
        index = endIndex + 1;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (text[index] === '~' && text[index + 1] === '~') {
      if (currentText) {
        nodes.push({ type: 'text', text: currentText });
        currentText = '';
      }

      const endIndex = text.indexOf('~~', index + 2);

      if (endIndex !== -1) {
        const strikeText = text.substring(index + 2, endIndex);
        nodes.push({
          type: 'text',
          text: strikeText,
          marks: [{ type: 'strike' }],
        });
        index = endIndex + 2;
        continue;
      }
    }

    // Link: [text](url) or [text](url "title")
    if (text[index] === '[') {
      const closeBracket = text.indexOf(']', index);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParenMatch = text.slice(Math.max(0, closeBracket + 2)).match(/^([^\s)]+)(?:\s+"([^"]+)")?\)/);

        if (closeParenMatch) {
          if (currentText) {
            nodes.push({ type: 'text', text: currentText });
            currentText = '';
          }

          const linkText = text.substring(index + 1, closeBracket);
          const href = closeParenMatch[1];
          const title = closeParenMatch[2];

          nodes.push({
            type: 'text',
            text: linkText,
            marks: [
              {
                type: 'link',
                attrs: title ? { href, title } : { href },
              },
            ],
          });

          index = closeBracket + 2 + closeParenMatch[0].length;
          continue;
        }
      }
    }

    currentText += text[index];
    index++;
  }

  if (currentText) {
    nodes.push({ type: 'text', text: currentText });
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text: '' }];
}

/**
 * Parse markdown with frontmatter
 */
export function parseMarkdownWithFrontmatter(markdown: string): MarkdownWithMeta {
  const { data, content } = matter(markdown);

  return {
    content,
    metadata: data as PostMetadata,
  };
}

/**
 * Add frontmatter to markdown
 */
export function addFrontmatter(markdown: string, metadata: PostMetadata): string {
  return matter.stringify(markdown, metadata);
}

/**
 * Convert TipTap JSON to Markdown with frontmatter
 */
export function tiptapToMarkdownWithMeta(
  json: JSONContent,
  metadata: PostMetadata
): string {
  const markdown = tiptapToMarkdown(json);
  return addFrontmatter(markdown, metadata);
}

/**
 * Convert Markdown with frontmatter to TipTap JSON
 */
export function markdownWithMetaToTipTap(markdown: string): {
  json: JSONContent;
  metadata: PostMetadata;
} {
  const { content, metadata } = parseMarkdownWithFrontmatter(markdown);
  const json = markdownToTipTap(content);

  return { json, metadata };
}
