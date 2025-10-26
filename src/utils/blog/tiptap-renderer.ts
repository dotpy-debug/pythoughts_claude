/**
 * Tiptap to HTML Renderer
 *
 * Converts tiptap JSONContent to HTML with:
 * - Stable heading IDs for anchor links
 * - Syntax highlighting in code blocks
 * - Full extension support (tables, task lists, etc.)
 */

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
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { lowlight } from 'lowlight';
import { TOCGenerator } from './toc-generator';

/**
 * Extensions configuration for HTML generation
 * Must match editor extensions for consistent rendering
 */
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
  TaskItem.configure({
    nested: true,
  }),
  Image,
  Link.configure({
    openOnClick: false,
  }),
];

/**
 * Inject heading IDs into tiptap JSON for anchors
 * This ensures stable IDs that match the TOC
 */
export function injectHeadingIds(content: JSONContent): JSONContent {
  const generator = new TOCGenerator();

  const traverse = (node: JSONContent): JSONContent => {
    if (node.type === 'heading' && node.content) {
      // Extract text from heading
      const text = extractTextFromNode(node);
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
 * Extract text from a tiptap node
 * Helper function for heading ID generation
 */
function extractTextFromNode(node: JSONContent): string {
  if (!node.content) return '';

  return node.content
    .map((child) => {
      if (child.type === 'text') return child.text || '';
      if (child.content) return extractTextFromNode(child);
      return '';
    })
    .join('');
}

/**
 * Convert tiptap JSON to HTML
 * Main export function for rendering blog content
 */
export function tiptapToHTML(content: JSONContent): string {
  const contentWithIds = injectHeadingIds(content);
  return generateHTML(contentWithIds, extensions);
}
