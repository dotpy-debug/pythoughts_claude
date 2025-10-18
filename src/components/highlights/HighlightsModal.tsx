import { useState } from 'react';
import { X, StickyNote, Trash2, Eye, EyeOff } from 'lucide-react';
import { Highlight } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface HighlightsModalProps {
  highlights: Highlight[];
  onClose: () => void;
  onUpdateHighlight: (highlightId: string, updates: { note?: string; is_public?: boolean }) => void;
  onDeleteHighlight: (highlightId: string) => void;
}

const COLOR_LABELS: Record<string, { label: string; bg: string; border: string }> = {
  yellow: { label: 'Yellow', bg: 'bg-yellow-400/30', border: 'border-yellow-400' },
  green: { label: 'Green', bg: 'bg-green-400/30', border: 'border-green-400' },
  blue: { label: 'Blue', bg: 'bg-blue-400/30', border: 'border-blue-400' },
  pink: { label: 'Pink', bg: 'bg-pink-400/30', border: 'border-pink-400' },
  purple: { label: 'Purple', bg: 'bg-purple-400/30', border: 'border-purple-400' },
};

export function HighlightsModal({
  highlights,
  onClose,
  onUpdateHighlight,
  onDeleteHighlight,
}: HighlightsModalProps) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const handleEditNote = (highlight: Highlight) => {
    setEditingNote(highlight.id);
    setNoteValue(highlight.note || '');
  };

  const handleSaveNote = (highlightId: string) => {
    onUpdateHighlight(highlightId, { note: noteValue });
    setEditingNote(null);
    setNoteValue('');
  };

  const handleTogglePublic = (highlight: Highlight) => {
    onUpdateHighlight(highlight.id, { is_public: !highlight.is_public });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-100 font-mono flex items-center space-x-2">
            <StickyNote size={20} className="text-terminal-green" />
            <span>Your Highlights ({highlights.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {highlights.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-mono">No highlights yet</p>
              <p className="text-sm text-gray-500 font-mono mt-2">
                Select text in the post to create your first highlight
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {highlights.map((highlight) => {
                const colorInfo = COLOR_LABELS[highlight.color];
                const isEditing = editingNote === highlight.id;

                return (
                  <div
                    key={highlight.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                  >
                    {/* Highlighted text */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 ${colorInfo.bg} border ${colorInfo.border} rounded text-xs font-mono`}>
                            {colorInfo.label}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatDistanceToNow(highlight.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleTogglePublic(highlight)}
                            className={`p-1.5 rounded transition-colors ${
                              highlight.is_public
                                ? 'bg-terminal-green text-gray-900'
                                : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                            }`}
                            title={highlight.is_public ? 'Public highlight' : 'Private highlight'}
                          >
                            {highlight.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={() => onDeleteHighlight(highlight.id)}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete highlight"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm font-mono leading-relaxed border-l-2 border-gray-600 pl-3">
                        "{highlight.highlighted_text}"
                      </p>
                    </div>

                    {/* Note */}
                    {isEditing ? (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-mono">Your Note</label>
                        <textarea
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          placeholder="Add your thoughts about this highlight..."
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-terminal-green resize-none font-mono"
                          rows={3}
                          autoFocus
                        />
                        <div className="mt-2 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingNote(null);
                              setNoteValue('');
                            }}
                            className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 font-mono"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNote(highlight.id)}
                            className="px-3 py-1 text-xs bg-terminal-green text-gray-900 rounded hover:bg-terminal-green/90 font-mono font-semibold"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {highlight.note ? (
                          <div className="bg-gray-900 rounded p-3 border border-gray-700">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <StickyNote size={14} className="text-terminal-green flex-shrink-0" />
                                <span className="text-xs text-gray-400 font-mono">Your Note</span>
                              </div>
                              <button
                                onClick={() => handleEditNote(highlight)}
                                className="text-xs text-terminal-green hover:text-terminal-green/80 font-mono"
                              >
                                Edit
                              </button>
                            </div>
                            <p className="text-sm text-gray-300 font-mono mt-2">{highlight.note}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditNote(highlight)}
                            className="text-xs text-gray-500 hover:text-terminal-green font-mono flex items-center space-x-1"
                          >
                            <StickyNote size={12} />
                            <span>Add a note</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-3 border-t border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-mono">
            Highlights are private by default. Toggle visibility to share with others.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-terminal-green text-gray-900 rounded hover:bg-terminal-green/90 font-mono font-semibold text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
