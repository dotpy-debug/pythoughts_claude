import { useState, useRef, useEffect } from 'react';
import { Highlighter, StickyNote, X } from 'lucide-react';
import { HighlightColor, TextSelection } from '../../hooks/useTextHighlight';

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; className: string }[] = [
  { color: 'yellow', label: 'Yellow', className: 'bg-yellow-400 hover:bg-yellow-500' },
  { color: 'green', label: 'Green', className: 'bg-green-400 hover:bg-green-500' },
  { color: 'blue', label: 'Blue', className: 'bg-blue-400 hover:bg-blue-500' },
  { color: 'pink', label: 'Pink', className: 'bg-pink-400 hover:bg-pink-500' },
  { color: 'purple', label: 'Purple', className: 'bg-purple-400 hover:bg-purple-500' },
];

interface HighlightToolbarProps {
  selection: TextSelection;
  onHighlight: (color: HighlightColor, note?: string) => void;
  onClose: () => void;
}

export function HighlightToolbar({ selection, onHighlight, onClose }: HighlightToolbarProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection.range) return;

    const rect = selection.range.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    // Position toolbar above the selection
    setPosition({
      top: rect.top + scrollY - 50,
      left: rect.left + scrollX + rect.width / 2,
    });
  }, [selection]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleColorSelect = (color: HighlightColor) => {
    if (showNoteInput && note.trim()) {
      onHighlight(color, note);
      setNote('');
      setShowNoteInput(false);
    } else {
      onHighlight(color);
    }
  };

  if (!position) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 transform -translate-x-1/2"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 flex items-center space-x-2">
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-gray-200"
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Color options */}
        <div className="flex items-center space-x-1">
          {HIGHLIGHT_COLORS.map(({ color, label, className }) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-6 h-6 rounded ${className} transition-all hover:scale-110 border border-gray-600`}
              title={`Highlight in ${label}`}
            />
          ))}
        </div>

        {/* Note button */}
        <button
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={`p-1.5 rounded transition-colors ${
            showNoteInput
              ? 'bg-terminal-green text-gray-900'
              : 'hover:bg-gray-800 text-gray-400 hover:text-terminal-green'
          }`}
          title="Add note"
        >
          <StickyNote size={16} />
        </button>
      </div>

      {/* Note input */}
      {showNoteInput && (
        <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
          <label className="block text-xs text-gray-400 mb-1 font-mono">Add a private note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Your thoughts on this highlight..."
            className="w-64 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-terminal-green resize-none font-mono"
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setNote('');
                setShowNoteInput(false);
              }}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 font-mono"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // User must now click a color to save with note
                // This just keeps the note input open
              }}
              className="px-3 py-1 text-xs bg-terminal-green text-gray-900 rounded hover:bg-terminal-green/90 font-mono font-semibold"
            >
              Save & Highlight
            </button>
          </div>
        </div>
      )}

      {/* Arrow pointing to selection */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-700"></div>
    </div>
  );
}
