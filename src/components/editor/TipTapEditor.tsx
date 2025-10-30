import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link2,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Table as TableIcon,
  Highlighter,

} from 'lucide-react';
import { ShadcnButton } from '../ui/ShadcnButton';
import { useState } from 'react';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageClick?: () => void;
  onPexelsClick?: () => void;
  maxLength?: number;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your blog post...',
  onImageClick,

  maxLength = 50000,
}: TipTapEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-600 underline',
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'rounded-lg my-4',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border border-gray-700',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-700 px-4 py-2',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-700 px-4 py-2 bg-gray-800 font-bold',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none bg-gray-800 rounded-lg border border-gray-700 text-gray-100',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addYoutubeVideo = () => {
    setShowYoutubeInput(true);
  };

  const insertYoutubeVideo = () => {
    if (youtubeUrl) {
      editor.commands.setYoutubeVideo({
        src: youtubeUrl,
        width: 640,
        height: 360,
      });
      setYoutubeUrl('');
      setShowYoutubeInput(false);
    }
  };

  const setLink = () => {
    setShowLinkInput(true);
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
  };

  const saveLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();

  return (
    <div className="w-full">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 mb-2 flex flex-wrap gap-1">
        <div className="flex gap-1 items-center border-r border-gray-700 pr-2">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Bold className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Italic className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Strikethrough className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Code className="h-4 w-4" />
          </ShadcnButton>
        </div>

        <div className="flex gap-1 items-center border-r border-gray-700 pr-2">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}
            type="button"
          >
            <Heading1 className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}
            type="button"
          >
            <Heading2 className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-gray-700' : ''}
            type="button"
          >
            <Heading3 className="h-4 w-4" />
          </ShadcnButton>
        </div>

        <div className="flex gap-1 items-center border-r border-gray-700 pr-2">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-700' : ''}
            type="button"
          >
            <List className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-700' : ''}
            type="button"
          >
            <ListOrdered className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Quote className="h-4 w-4" />
          </ShadcnButton>
        </div>

        <div className="flex gap-1 items-center border-r border-gray-700 pr-2">
          <ShadcnButton variant="ghost" size="sm" onClick={setLink} type="button">
            <Link2 className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton variant="ghost" size="sm" onClick={onImageClick || addImage} type="button">
            <ImageIcon className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton variant="ghost" size="sm" onClick={addYoutubeVideo} type="button">
            <YoutubeIcon className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton variant="ghost" size="sm" onClick={addTable} type="button">
            <TableIcon className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Highlighter className="h-4 w-4" />
          </ShadcnButton>
        </div>

        <div className="flex gap-1 items-center">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            type="button"
          >
            <Undo className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            type="button"
          >
            <Redo className="h-4 w-4" />
          </ShadcnButton>
        </div>
      </div>

      {showLinkInput && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex gap-2 items-center">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveLink();
              }
            }}
          />
          <ShadcnButton variant="default" size="sm" onClick={saveLink} type="button">
            Save
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkInput(false)}
            type="button"
          >
            Cancel
          </ShadcnButton>
        </div>
      )}

      {showYoutubeInput && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2 flex gap-2 items-center">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                insertYoutubeVideo();
              }
            }}
          />
          <ShadcnButton variant="default" size="sm" onClick={insertYoutubeVideo} type="button">
            Insert
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => setShowYoutubeInput(false)}
            type="button"
          >
            Cancel
          </ShadcnButton>
        </div>
      )}

      <EditorContent editor={editor} />

      <div className="mt-2 flex justify-between items-center text-sm text-gray-400 font-mono">
        <div>
          {characterCount} characters · {wordCount} words
        </div>
        {maxLength && (
          <div className={characterCount > maxLength * 0.9 ? 'text-yellow-500' : ''}>
            {maxLength - characterCount} remaining
          </div>
        )}
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-1 flex gap-1"
        >
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Bold className="h-3 w-3" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Italic className="h-3 w-3" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={editor.isActive('link') ? 'bg-gray-700' : ''}
            type="button"
          >
            <Link2 className="h-3 w-3" />
          </ShadcnButton>
        </BubbleMenu>
      )}
    </div>
  );
}
