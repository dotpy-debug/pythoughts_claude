/**
 * Editor Toolbar Component
 *
 * Provides formatting controls for the tiptap editor:
 * - Text formatting (bold, italic, strikethrough, code)
 * - Headings (h1, h2, h3)
 * - Lists (bullet, numbered, task)
 * - Blocks (blockquote, code block, callout)
 * - Media (link, image, table, HR)
 */

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
import { Separator } from '../../ui/separator';
import { cn } from '../../../lib/utils';

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
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      />
      <ToolbarButton
        icon={Heading2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      />
      <ToolbarButton
        icon={Heading3}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
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
        onClick={() =>
          editor.chain().focus().setCallout({ type: 'info' }).run()
        }
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
