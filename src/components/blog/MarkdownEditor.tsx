import { useState, lazy, Suspense } from 'react';
import { ShadcnButton } from '../ui/ShadcnButton';
import { Eye, Code, Loader2 } from 'lucide-react';

// Lazy load the markdown editor to reduce initial bundle size
const MDEditor = lazy(() => import('@uiw/react-md-editor'));

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function MarkdownEditor({ value, onChange, placeholder = 'Write your blog post in markdown...' }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400 font-mono">$ blog_editor.md</span>
        <div className="flex gap-2">
          <ShadcnButton
            variant={!preview ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setPreview(false)}
          >
            <Code className="h-4 w-4" />
            Edit
          </ShadcnButton>
          <ShadcnButton
            variant={preview ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setPreview(true)}
          >
            <Eye className="h-4 w-4" />
            Preview
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
            preview={preview ? 'preview' : 'edit'}
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
