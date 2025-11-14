import { ReactNode, useEffect, useRef } from 'react';
import { useTextHighlight, HighlightColor } from '../../hooks/useTextHighlight';
import { HighlightToolbar } from './HighlightToolbar';
import { HighlightRenderer } from './HighlightRenderer';
import { useAuth } from '../../contexts/AuthContext';
import { liveAnnouncer } from '../../utils/accessibility';

interface TextHighlighterProperties {
  postId: string;
  content: string;
  children?: ReactNode;
  enabled?: boolean;
}

export function TextHighlighter({ postId, content, children, enabled = true }: TextHighlighterProperties) {
  const { user } = useAuth();
  const containerReference = useRef<HTMLDivElement>(null);
  const {
    highlights,
    selection,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    handleTextSelection,
    clearSelection,
  } = useTextHighlight(postId);

  useEffect(() => {
    if (!enabled || !user) return;

    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        handleTextSelection();
      }, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle keyboard text selection (shift + arrows)
      if (e.shiftKey) {
        handleTextSelection();
      }
    };

    const container = containerReference.current;
    if (container) {
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('keyup', handleKeyUp);

      return () => {
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [enabled, user, handleTextSelection]);

  const handleHighlight = async (color: HighlightColor, note?: string) => {
    if (!selection) return;

    const highlight = await createHighlight(
      selection.text,
      selection.startOffset,
      selection.endOffset,
      color,
      note
    );

    if (highlight) {
      liveAnnouncer.announce(`Text highlighted in ${color}${note ? ' with note' : ''}`, 'polite');
      clearSelection();
      globalThis.getSelection()?.removeAllRanges();
    }
  };

  const handleUpdateNote = async (highlightId: string, note: string) => {
    const success = await updateHighlight(highlightId, { note });
    if (success) {
      liveAnnouncer.announce('Highlight note updated', 'polite');
    }
  };

  const handleDelete = async (highlightId: string) => {
    const success = await deleteHighlight(highlightId);
    if (success) {
      liveAnnouncer.announce('Highlight deleted', 'polite');
    }
  };

  if (!user) {
    return <div className="text-gray-300">{children || content}</div>;
  }

  return (
    <div ref={containerReference} className="relative">
      {children ? (
        children
      ) : (
        <HighlightRenderer
          highlights={highlights}
          content={content}
          onUpdateHighlight={handleUpdateNote}
          onDeleteHighlight={handleDelete}
        />
      )}

      {selection && enabled && (
        <HighlightToolbar
          selection={selection}
          onHighlight={handleHighlight}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
