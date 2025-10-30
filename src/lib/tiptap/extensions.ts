/**
 * Tiptap Extensions Configuration
 *
 * Central configuration for all tiptap extensions used in the blog editor.
 * Extensions must match those used in HTML generation for WYSIWYG consistency.
 */

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
import { common, createLowlight } from 'lowlight';
import { CustomHeading } from './custom-heading';
import { Callout } from './callout-extension';

const lowlight = createLowlight(common);

export const editorExtensions = [
  StarterKit.configure({
    heading: false, // Use custom heading with ID support
    codeBlock: false, // Use CodeBlockLowlight instead
  }),
  CustomHeading, // Custom heading with ID injection
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
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'blog-image',
      loading: 'lazy',
      decoding: 'async',
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'blog-link',
    },
  }),
  Callout, // Custom callout extension
];
