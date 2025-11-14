/**
 * EditorModeToggle Component
 *
 * Toggle between Visual (TipTap) and Markdown editing modes
 * Features:
 * - Seamless mode switching
 * - Content preservation during conversion
 * - Visual mode switcher UI
 * - Terminal-themed design
 */

import { useState } from 'react';
import { Eye, Code, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type EditorMode = 'visual' | 'markdown';

interface EditorModeToggleProperties {
  /**
   * Current editor mode
   */
  mode: EditorMode;

  /**
   * Callback when mode changes
   */
  onModeChange: (mode: EditorMode) => void;

  /**
   * Whether content has unsaved changes
   */
  hasUnsavedChanges?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Whether to show warning before switching
   * @default true
   */
  showWarning?: boolean;
}

/**
 * EditorModeToggle Component
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useState<EditorMode>('visual');
 *
 * <EditorModeToggle
 *   mode={mode}
 *   onModeChange={setMode}
 *   hasUnsavedChanges={isDirty}
 * />
 * ```
 */
export function EditorModeToggle({
  mode,
  onModeChange,
  hasUnsavedChanges = false,
  className,
  showWarning = true,
}: EditorModeToggleProperties) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<EditorMode | null>(null);

  const handleModeChange = (newMode: EditorMode) => {
    if (newMode === mode) return;

    // Show warning if there are unsaved changes and warnings are enabled
    if (showWarning && hasUnsavedChanges) {
      setPendingMode(newMode);
      setShowConfirm(true);
    } else {
      onModeChange(newMode);
    }
  };

  const handleConfirm = () => {
    if (pendingMode) {
      onModeChange(pendingMode);
    }
    setShowConfirm(false);
    setPendingMode(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingMode(null);
  };

  return (
    <>
      <div className={cn('inline-flex items-center gap-0.5 p-1 bg-gray-800 rounded-lg border border-gray-700', className)}>
        <button
          onClick={() => handleModeChange('visual')}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono transition-all duration-200',
            mode === 'visual'
              ? 'bg-terminal-green text-gray-900 font-bold shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          )}
          aria-label="Visual editor"
          aria-pressed={mode === 'visual'}
        >
          <Eye size={16} />
          <span>Visual</span>
        </button>

        <button
          onClick={() => handleModeChange('markdown')}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-mono transition-all duration-200',
            mode === 'markdown'
              ? 'bg-terminal-green text-gray-900 font-bold shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          )}
          aria-label="Markdown editor"
          aria-pressed={mode === 'markdown'}
        >
          <Code size={16} />
          <span>Markdown</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div className="w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100 font-mono">
                  Switch Editor Mode?
                </h2>
                <p className="text-sm text-gray-400">
                  Unsaved changes detected
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-300">
                You have unsaved changes. Switching editor modes will convert your content. While we preserve formatting, some advanced features may be simplified.
              </p>

              <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 font-mono">
                  <strong className="text-terminal-green">Tip:</strong> Save your work before switching modes to prevent any potential data loss.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-900/50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition-colors font-mono text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg bg-terminal-blue text-gray-900 hover:bg-terminal-green font-bold transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
              >
                Switch Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Compact mode toggle (icon only)
 */
export function CompactEditorModeToggle({
  mode,
  onModeChange,
  className,
}: Pick<EditorModeToggleProperties, 'mode' | 'onModeChange' | 'className'>) {
  return (
    <button
      onClick={() => onModeChange(mode === 'visual' ? 'markdown' : 'visual')}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
        mode === 'visual'
          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          : 'bg-terminal-green border-terminal-green text-gray-900 hover:bg-terminal-blue',
        className
      )}
      aria-label={`Switch to ${mode === 'visual' ? 'Markdown' : 'Visual'} mode`}
      title={`Currently in ${mode} mode. Click to switch.`}
    >
      {mode === 'visual' ? (
        <>
          <Code size={16} />
          <span className="text-xs font-mono">Markdown</span>
        </>
      ) : (
        <>
          <Eye size={16} />
          <span className="text-xs font-mono">Visual</span>
        </>
      )}
    </button>
  );
}
