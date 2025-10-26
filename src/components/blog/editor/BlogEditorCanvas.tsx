/**
 * Blog Editor Canvas
 *
 * Main blog editor component with three-column layout:
 * - Left: Live TOC preview
 * - Center: Tiptap editor
 * - Right: Post metadata panel
 *
 * Features:
 * - Auto-save with debounce
 * - Real-time TOC generation
 * - Word count tracking
 * - WYSIWYG editing
 */

import { useEditor, EditorContent } from '@tiptap/react';
import { useState, useEffect } from 'react';
import { editorExtensions } from '../../../lib/tiptap/extensions';
import { BlogEditorState, BlogPost } from '../../../types/blog';
import { EditorToolbar } from './EditorToolbar';
import { EditorTOC } from './EditorTOC';
import { PostMetaPanel } from './PostMetaPanel';
import {
  TOCGenerator,
  extractWordCount,
  calculateReadingTime,
} from '../../../utils/blog/toc-generator';
import { useDebounce } from '../../../hooks/useDebounce';
import { Save } from 'lucide-react';
import './editor-styles.css';

interface BlogEditorCanvasProps {
  initialPost?: Partial<BlogPost>;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
  onPublish: (post: Partial<BlogPost>) => Promise<void>;
}

export function BlogEditorCanvas({
  initialPost,
  onSave,
  onPublish,
}: BlogEditorCanvasProps) {
  const [editorState, setEditorState] = useState<BlogEditorState>({
    post: initialPost || {},
    isSaving: false,
    hasUnsavedChanges: false,
  });

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialPost?.content_json || {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Untitled Post' }],
        },
      ],
    },
    editorProps: {
      attributes: {
        class: 'blog-editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      setEditorState((prev) => ({
        ...prev,
        hasUnsavedChanges: true,
        post: {
          ...prev.post,
          content_json: editor.getJSON(),
        },
      }));
    },
  });

  // Auto-save with debounce
  const debouncedContent = useDebounce(
    editorState.post.content_json,
    2000
  );

  useEffect(() => {
    if (debouncedContent && editorState.hasUnsavedChanges) {
      handleAutoSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  const handleAutoSave = async () => {
    if (!editor) return;

    setEditorState((prev) => ({ ...prev, isSaving: true }));

    try {
      const generator = new TOCGenerator();
      const toc = generator.extractFromJSON(editor.getJSON());
      const wordCount = extractWordCount(editor.getJSON());
      const readingTime = calculateReadingTime(wordCount);

      const updatedPost: Partial<BlogPost> = {
        ...editorState.post,
        content_json: editor.getJSON(),
        toc_data: toc,
        word_count: wordCount,
        reading_time_minutes: readingTime,
      };

      await onSave(updatedPost);

      setEditorState((prev) => ({
        ...prev,
        post: updatedPost,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      console.error('Auto-save failed:', error);
      setEditorState((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handlePublish = async () => {
    if (!editor) return;

    try {
      await handleAutoSave();
      await onPublish(editorState.post);
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  if (!editor) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-[#E6EDF3]/60">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-[#161b22]/95 backdrop-blur-md border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[#E6EDF3]">
              Blog Editor
            </h1>
            {editorState.isSaving && (
              <span className="text-sm text-[#E6EDF3]/60 flex items-center gap-2">
                <Save size={14} className="animate-pulse" />
                Saving...
              </span>
            )}
            {editorState.lastSaved && !editorState.isSaving && (
              <span className="text-sm text-[#E6EDF3]/60">
                Saved {editorState.lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[#E6EDF3]/60">
              {editor.storage.characterCount.words()} words
            </span>
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-[#27C93F] text-[#0d1117] rounded-lg font-medium hover:bg-[#27C93F]/90 transition-colors"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 p-6">
        {/* Left: Live TOC */}
        <EditorTOC editor={editor} />

        {/* Center: Editor */}
        <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <EditorToolbar editor={editor} />
          <div className="p-8">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right: Metadata */}
        <PostMetaPanel
          post={editorState.post}
          onChange={(post) =>
            setEditorState((prev) => ({
              ...prev,
              post: { ...prev.post, ...post },
              hasUnsavedChanges: true,
            }))
          }
        />
      </div>
    </div>
  );
}
