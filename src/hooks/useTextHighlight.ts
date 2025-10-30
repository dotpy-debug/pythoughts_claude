import { useState, useCallback, useEffect } from 'react';
import { supabase, Highlight } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  range: Range | null;
}

export function useTextHighlight(postId: string | undefined) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<TextSelection | null>(null);

  // Load highlights for the post
  const loadHighlights = useCallback(async () => {
    if (!postId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .order('start_offset', { ascending: true });

      if (error) throw error;
      setHighlights(data || []);
    } catch (error) {
      logger.error('Error loading highlights', { errorDetails: error, postId, userId: user?.id });
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Create a new highlight
  const createHighlight = useCallback(
    async (
      highlightedText: string,
      startOffset: number,
      endOffset: number,
      color: HighlightColor,
      note?: string
    ) => {
      if (!user || !postId) return null;

      try {
        const { data, error } = await supabase
          .from('highlights')
          .insert({
            user_id: user.id,
            post_id: postId,
            highlighted_text: highlightedText,
            start_offset: startOffset,
            end_offset: endOffset,
            color,
            note: note || '',
            is_public: false,
          })
          .select()
          .single();

        if (error) throw error;

        setHighlights((prev) => [...prev, data]);
        logger.info('Highlight created', { highlightId: data.id });
        return data;
      } catch (error) {
        logger.error('Error creating highlight', { errorDetails: error, postId, userId: user.id });
        return null;
      }
    },
    [user, postId]
  );

  // Update highlight
  const updateHighlight = useCallback(
    async (highlightId: string, updates: Partial<Pick<Highlight, 'color' | 'note' | 'is_public'>>) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('highlights')
          .update(updates)
          .eq('id', highlightId)
          .eq('user_id', user.id);

        if (error) throw error;

        setHighlights((prev) =>
          prev.map((h) => (h.id === highlightId ? { ...h, ...updates } : h))
        );
        logger.info('Highlight updated', { highlightId });
        return true;
      } catch (error) {
        logger.error('Error updating highlight', { errorDetails: error, highlightId });
        return false;
      }
    },
    [user]
  );

  // Delete highlight
  const deleteHighlight = useCallback(
    async (highlightId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('highlights')
          .delete()
          .eq('id', highlightId)
          .eq('user_id', user.id);

        if (error) throw error;

        setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
        logger.info('Highlight deleted', { highlightId });
        return true;
      } catch (error) {
        logger.error('Error deleting highlight', { errorDetails: error, highlightId });
        return false;
      }
    },
    [user]
  );

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const text = windowSelection.toString().trim();

    if (!text || text.length === 0) {
      setSelection(null);
      return;
    }

    // Calculate offsets based on the full text content
    const container = range.commonAncestorContainer;
    const rootElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : (container as Element);

    if (!rootElement) {
      setSelection(null);
      return;
    }

    // Calculate text offsets from selection range
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(rootElement);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = beforeRange.toString().length;
    const endOffset = startOffset + text.length;

    setSelection({
      text,
      startOffset,
      endOffset,
      range,
    });
  }, []);

  return {
    highlights,
    loading,
    selection,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    handleTextSelection,
    clearSelection: () => setSelection(null),
  };
}
