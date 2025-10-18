import { useState } from 'react';
import { Highlight } from '../../lib/supabase';
import { StickyNote, Edit2, Trash2 } from 'lucide-react';

interface HighlightRendererProps {
  highlights: Highlight[];
  content: string;
  onUpdateHighlight?: (highlightId: string, note: string) => void;
  onDeleteHighlight?: (highlightId: string) => void;
}

const COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-400/30 border-b-2 border-yellow-400',
  green: 'bg-green-400/30 border-b-2 border-green-400',
  blue: 'bg-blue-400/30 border-b-2 border-blue-400',
  pink: 'bg-pink-400/30 border-b-2 border-pink-400',
  purple: 'bg-purple-400/30 border-b-2 border-purple-400',
};

export function HighlightRenderer({
  highlights,
  content,
  onUpdateHighlight,
  onDeleteHighlight,
}: HighlightRendererProps) {
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  if (highlights.length === 0) {
    return <div className="text-gray-300">{content}</div>;
  }

  // Sort highlights by start offset
  const sortedHighlights = [...highlights].sort((a, b) => a.start_offset - b.start_offset);

  // Build segments of text with highlights
  const segments: Array<{ text: string; highlight?: Highlight }> = [];
  let currentIndex = 0;

  sortedHighlights.forEach((highlight) => {
    // Add text before highlight
    if (currentIndex < highlight.start_offset) {
      segments.push({
        text: content.substring(currentIndex, highlight.start_offset),
      });
    }

    // Add highlighted text
    segments.push({
      text: content.substring(highlight.start_offset, highlight.end_offset),
      highlight,
    });

    currentIndex = highlight.end_offset;
  });

  // Add remaining text
  if (currentIndex < content.length) {
    segments.push({
      text: content.substring(currentIndex),
    });
  }

  const handleEditNote = (highlight: Highlight) => {
    setEditingNote(highlight.id);
    setNoteValue(highlight.note || '');
  };

  const handleSaveNote = (highlightId: string) => {
    if (onUpdateHighlight) {
      onUpdateHighlight(highlightId, noteValue);
    }
    setEditingNote(null);
    setNoteValue('');
  };

  return (
    <div className="relative">
      <div className="text-gray-300 leading-relaxed">
        {segments.map((segment, index) => {
          if (!segment.highlight) {
            return <span key={index}>{segment.text}</span>;
          }

          const highlight = segment.highlight;
          const isActive = activeHighlight === highlight.id;
          const isEditing = editingNote === highlight.id;

          return (
            <span key={index} className="relative inline-block">
              <span
                className={`${COLOR_CLASSES[highlight.color]} cursor-pointer relative`}
                onMouseEnter={() => setActiveHighlight(highlight.id)}
                onMouseLeave={() => setActiveHighlight(null)}
              >
                {segment.text}
              </span>

              {/* Highlight popup */}
              {isActive && (
                <div
                  className="absolute z-10 left-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[250px] max-w-[350px]"
                  onMouseEnter={() => setActiveHighlight(highlight.id)}
                  onMouseLeave={() => setActiveHighlight(null)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded ${
                          highlight.color === 'yellow'
                            ? 'bg-yellow-400'
                            : highlight.color === 'green'
                            ? 'bg-green-400'
                            : highlight.color === 'blue'
                            ? 'bg-blue-400'
                            : highlight.color === 'pink'
                            ? 'bg-pink-400'
                            : 'bg-purple-400'
                        }`}
                      />
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(highlight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditNote(highlight)}
                        className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-terminal-green transition-colors"
                        title="Edit note"
                      >
                        <Edit2 size={14} />
                      </button>
                      {onDeleteHighlight && (
                        <button
                          onClick={() => onDeleteHighlight(highlight.id)}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete highlight"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Add a private note..."
                        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-terminal-green resize-none font-mono"
                        rows={3}
                        autoFocus
                      />
                      <div className="mt-2 flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingNote(null);
                            setNoteValue('');
                          }}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 font-mono"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNote(highlight.id)}
                          className="px-2 py-1 text-xs bg-terminal-green text-gray-900 rounded hover:bg-terminal-green/90 font-mono font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : highlight.note ? (
                    <div className="bg-gray-800 rounded p-2 mt-2">
                      <div className="flex items-start space-x-2">
                        <StickyNote size={14} className="text-terminal-green mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-300 font-mono">{highlight.note}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic font-mono">No note added</p>
                  )}

                  {/* Arrow pointing to highlighted text */}
                  <div className="absolute bottom-full left-4 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-700"></div>
                </div>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
