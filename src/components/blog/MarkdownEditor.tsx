import { useState, lazy, Suspense } from 'react';
import { ShadcnButton } from '../ui/ShadcnButton';
import { Eye, Code, Loader2, Columns, Bold, Italic, Heading1, Heading2, Link2, List, ListOrdered, CodeIcon, Quote } from 'lucide-react';

// Lazy load the markdown editor to reduce initial bundle size
const MDEditor = lazy(() => import('@uiw/react-md-editor'));

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type ViewMode = 'edit' | 'preview' | 'split';

export function MarkdownEditor({ value, onChange, placeholder = 'Write your blog post in markdown...' }: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const insertMarkdown = (before: string, after: string = '', placeholderText: string = '') => {
    // Insert at the end of the content
    const textToInsert = placeholderText;
    const newText = value + '\n' + before + textToInsert + after;
    onChange(newText);
  };

  const formatBold = () => insertMarkdown('**', '**', 'bold text');
  const formatItalic = () => insertMarkdown('_', '_', 'italic text');
  const formatH1 = () => insertMarkdown('# ', '', 'Heading 1');
  const formatH2 = () => insertMarkdown('## ', '', 'Heading 2');
  const formatLink = () => insertMarkdown('[', '](url)', 'link text');
  const formatList = () => insertMarkdown('- ', '', 'list item');
  const formatOrderedList = () => insertMarkdown('1. ', '', 'list item');
  const formatCode = () => insertMarkdown('```\n', '\n```', 'code');
  const formatQuote = () => insertMarkdown('> ', '', 'quote');

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-2 mb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 font-mono">$ blog_editor.md</span>
          <div className="flex gap-2">
            <ShadcnButton
              variant={viewMode === 'edit' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('edit')}
            >
              <Code className="h-4 w-4" />
              Edit
            </ShadcnButton>
            <ShadcnButton
              variant={viewMode === 'split' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('split')}
            >
              <Columns className="h-4 w-4" />
              Split
            </ShadcnButton>
            <ShadcnButton
              variant={viewMode === 'preview' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4" />
              Preview
            </ShadcnButton>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-2 bg-gray-800 border border-gray-700 rounded">
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatBold}
            title="Bold (Ctrl+B)"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatItalic}
            title="Italic (Ctrl+I)"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </ShadcnButton>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatH1}
            title="Heading 1"
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatH2}
            title="Heading 2"
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </ShadcnButton>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatLink}
            title="Insert Link"
            className="h-8 w-8 p-0"
          >
            <Link2 className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatList}
            title="Bullet List"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatOrderedList}
            title="Numbered List"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </ShadcnButton>
          <div className="w-px h-6 bg-gray-700 mx-1" />
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatCode}
            title="Code Block"
            className="h-8 w-8 p-0"
          >
            <CodeIcon className="h-4 w-4" />
          </ShadcnButton>
          <ShadcnButton
            variant="ghost"
            size="sm"
            onClick={formatQuote}
            title="Quote"
            className="h-8 w-8 p-0"
          >
            <Quote className="h-4 w-4" />
          </ShadcnButton>
        </div>
      </div>

      <div data-color-mode="dark">
        <Suspense fallback={
          <div className="h-[500px] bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
            <Loader2 className="animate-spin text-terminal-green" size={32} />
          </div>
        }>
          <MDEditor
            value={value}
            onChange={(val) => onChange(val || '')}
            preview={viewMode === 'preview' ? 'preview' : viewMode === 'split' ? 'live' : 'edit'}
            height={500}
            visibleDragbar={false}
            className="!bg-gray-800 !border-gray-700"
            previewOptions={{
              className: 'prose prose-invert max-w-none',
            }}
            textareaProps={{
              placeholder,
              className: 'font-mono',
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
