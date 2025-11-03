import { useEffect } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatches && ctrlMatches && shiftMatches && altMatches;
      });

      if (matchedShortcut) {
        event.preventDefault();
        matchedShortcut.action();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('⌘');
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push('⌥');
  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
