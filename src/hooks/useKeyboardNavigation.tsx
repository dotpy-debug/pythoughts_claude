import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcuts configuration
 */
export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
};

/**
 * Hook to handle keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, action: () => openSearch(), description: 'Open search' },
 *   { key: 'n', ctrl: true, action: () => newPost(), description: 'New post' },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook to manage focus trap (for modals/dialogs)
 *
 * @example
 * const modalRef = useFocusTrap(isOpen);
 * return <div ref={modalRef}>...</div>;
 */
export function useFocusTrap(isActive: boolean) {
  const reference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !reference.current) return;

    const container = reference.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [isActive]);

  return reference;
}

/**
 * Hook to manage arrow key navigation in lists
 *
 * @example
 * const { focusedIndex, setFocusedIndex } = useArrowKeyNavigation(items.length);
 */
export function useArrowKeyNavigation(itemCount: number, options: {
  onSelect?: (index: number) => void;
  loop?: boolean;
} = {}) {
  const { onSelect, loop = true } = options;
  const focusedIndexReference = useRef(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentIndex = focusedIndexReference.current;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex + 1;
        focusedIndexReference.current = loop
          ? nextIndex % itemCount
          : Math.min(nextIndex, itemCount - 1);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const previousIndex = currentIndex - 1;
        focusedIndexReference.current = loop
          ? (previousIndex + itemCount) % itemCount
          : Math.max(previousIndex, 0);
        break;
      }

      case 'Enter': {
        event.preventDefault();
        onSelect?.(currentIndex);
        break;
      }

      case 'Escape': {
        event.preventDefault();
        focusedIndexReference.current = 0;
        break;
      }
    }
  }, [itemCount, loop, onSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedIndex: focusedIndexReference.current,
    setFocusedIndex: (index: number) => {
      focusedIndexReference.current = index;
    },
  };
}

/**
 * Hook to handle Escape key
 */
export function useEscapeKey(callback: () => void) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback]);
}

/**
 * Hook to skip to main content (accessibility)
 */
export function useSkipToContent() {
  const handleSkip = useCallback(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return handleSkip;
}

/**
 * Component for skip navigation link
 */
export function SkipNavLink() {
  const handleSkip = useSkipToContent();

  return (
    <a
      href="#main-content"
      onClick={(e) => {
        e.preventDefault();
        handleSkip();
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-terminal-green focus:text-gray-900 focus:rounded focus:font-mono focus:font-semibold"
    >
      Skip to main content
    </a>
  );
}

/**
 * Hook to announce screen reader messages
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.append(announcement);

    // Remove after announcement
    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }, []);

  return announce;
}

/**
 * Global keyboard shortcuts for the app
 */
export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: '/',
    action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"]');
      searchInput?.focus();
    },
    description: 'Focus search',
    preventDefault: true,
  },
  {
    key: 'n',
    ctrl: true,
    action: () => {
      const newPostButton = document.querySelector<HTMLButtonElement>('button:has([class*="PenSquare"])');
      newPostButton?.click();
    },
    description: 'New post',
  },
  {
    key: 'k',
    ctrl: true,
    action: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="text"][placeholder*="Search"]');
      searchInput?.focus();
    },
    description: 'Open search',
  },
  {
    key: 'h',
    ctrl: true,
    action: () => {
      globalThis.location.href = '/';
    },
    description: 'Go to home',
  },
  {
    key: 'b',
    ctrl: true,
    action: () => {
      globalThis.location.href = '/bookmarks';
    },
    description: 'Go to bookmarks',
  },
  {
    key: 'p',
    ctrl: true,
    action: () => {
      globalThis.location.href = '/profile';
    },
    description: 'Go to profile',
  },
  {
    key: '?',
    shift: true,
    action: () => {
      // Show keyboard shortcuts help modal
      console.log('Keyboard shortcuts help');
    },
    description: 'Show keyboard shortcuts',
  },
];
