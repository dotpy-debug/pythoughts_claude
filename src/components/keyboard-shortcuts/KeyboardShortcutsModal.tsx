import { X, Keyboard } from 'lucide-react';
import { getShortcutLabel, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

type KeyboardShortcutsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
};

export function KeyboardShortcutsModal({ isOpen, onClose, shortcuts }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  // Group shortcuts by category
  const navigation = shortcuts.filter(s => s.description.includes('Navigate') || s.description.includes('Go to'));
  const actions = shortcuts.filter(s => s.description.includes('Create') || s.description.includes('Open') || s.description.includes('New'));
  const other = shortcuts.filter(s => !navigation.includes(s) && !actions.includes(s));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700 sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="flex-1 flex items-center justify-center">
              <Keyboard size={16} className="text-gray-500 mr-2" />
              <span className="text-xs text-gray-500 font-mono">keyboard-shortcuts.conf</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-terminal-green font-mono mb-2">
            $ keyboard shortcuts
          </h2>
          <p className="text-gray-400 font-mono text-sm mb-6">
            Master these shortcuts to navigate Pythoughts like a pro
          </p>

          {/* Navigation Shortcuts */}
          {navigation.length > 0 && (
            <div className="mb-6">
              <h3 className="text-terminal-blue font-mono font-semibold mb-3">Navigation</h3>
              <div className="space-y-2">
                {navigation.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          )}

          {/* Action Shortcuts */}
          {actions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-terminal-purple font-mono font-semibold mb-3">Actions</h3>
              <div className="space-y-2">
                {actions.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          )}

          {/* Other Shortcuts */}
          {other.length > 0 && (
            <div>
              <h3 className="text-terminal-green font-mono font-semibold mb-3">Other</h3>
              <div className="space-y-2">
                {other.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          )}

          {/* Help Footer */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-500 font-mono text-xs text-center">
              Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-terminal-green">?</kbd> anytime to toggle this help
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded border border-gray-700/50 hover:border-gray-600 transition-colors">
      <span className="text-gray-300 font-mono text-sm">{shortcut.description}</span>
      <kbd className="px-3 py-1 bg-gray-900 border border-gray-600 rounded font-mono text-xs text-terminal-green font-semibold shadow-sm">
        {getShortcutLabel(shortcut)}
      </kbd>
    </div>
  );
}
