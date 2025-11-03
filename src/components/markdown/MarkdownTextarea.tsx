/**
 * MarkdownTextarea Component
 *
 * Textarea optimized for markdown editing
 * Features:
 * - Monospace font
 * - Auto-resizing
 * - Keyboard shortcuts
 * - Line count display
 * - Terminal-themed design
 */

import { useState, useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MarkdownTextareaProperties {
  /**
   * Markdown content
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Whether the textarea is disabled
   */
  disabled?: boolean;

  /**
   * Minimum height in pixels
   * @default 400
   */
  minHeight?: number;

  /**
   * Whether to show line count
   * @default true
   */
  showLineCount?: boolean;

  /**
   * Whether to show character count
   * @default true
   */
  showCharCount?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean;
}

/**
 * MarkdownTextarea Component
 *
 * @example
 * ```tsx
 * const [markdown, setMarkdown] = useState('# Hello World\n\nThis is **bold**.');
 *
 * <MarkdownTextarea
 *   value={markdown}
 *   onChange={setMarkdown}
 *   placeholder="Write your markdown here..."
 *   minHeight={500}
 * />
 * ```
 */
export function MarkdownTextarea({
  value,
  onChange,
  placeholder = 'Write your markdown here...',
  disabled = false,
  minHeight = 400,
  showLineCount = true,
  showCharCount = true,
  className,
  autoFocus = false,
}: MarkdownTextareaProperties) {
  const textareaReference = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // Update stats when value changes
  useEffect(() => {
    const lines = value.split('\n').length;
    const chars = value.length;
    const words = value.trim().split(/\s+/).filter(Boolean).length;

    setLineCount(lines);
    setCharCount(chars);
    setWordCount(words);
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaReference.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto';

    // Set new height
    const newHeight = Math.max(minHeight, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // Tab key - insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, Math.max(0, start)) + '  ' + value.slice(Math.max(0, end));

      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }

    // Cmd/Ctrl + B - Bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      insertMarkdown('**', '**');
    }

    // Cmd/Ctrl + I - Italic
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      insertMarkdown('*', '*');
    }

    // Cmd/Ctrl + K - Link
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      insertMarkdown('[', '](url)');
    }
  };

  const insertMarkdown = (before: string, after: string) => {
    const textarea = textareaReference.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newValue =
      value.slice(0, Math.max(0, start)) +
      before +
      selectedText +
      after +
      value.slice(Math.max(0, end));

    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Textarea */}
      <textarea
        ref={textareaReference}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg',
          'text-gray-100 placeholder-gray-500',
          'font-mono text-sm leading-relaxed',
          'focus:outline-none focus:border-terminal-green',
          'transition-colors resize-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'whitespace-pre-wrap break-words'
        )}
        style={{ minHeight: `${minHeight}px` }}
        spellCheck={false}
      />

      {/* Stats Bar */}
      {(showLineCount || showCharCount) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border border-t-0 border-gray-700 rounded-b-lg text-xs font-mono text-gray-400">
          <div className="flex items-center gap-4">
            {showLineCount && (
              <span>
                <span className="text-terminal-green">{lineCount}</span> lines
              </span>
            )}
            {showCharCount && (
              <>
                <span>
                  <span className="text-terminal-green">{wordCount}</span> words
                </span>
                <span>
                  <span className="text-terminal-green">{charCount}</span> chars
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <FileText size={14} />
            <span>Markdown</span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 px-1 text-xs text-gray-500 font-mono">
        <span className="text-gray-600">Shortcuts:</span>{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
          ⌘B
        </kbd>{' '}
        bold,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
          ⌘I
        </kbd>{' '}
        italic,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
          ⌘K
        </kbd>{' '}
        link,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
          Tab
        </kbd>{' '}
        indent
      </div>
    </div>
  );
}
