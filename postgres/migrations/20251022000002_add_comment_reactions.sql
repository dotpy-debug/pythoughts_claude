/**
 * Comment Reactions Migration
 *
 * Adds emoji-style reactions to comments (beyond up/down votes)
 * Features:
 * - Multiple reaction types (👍, ❤️, 😂, 🎉, 🤔, 👎)
 * - User can add one reaction per type per comment
 * - Reaction counts cached on comments table
 * - Real-time updates via triggers
 */

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reaction type
  reaction_type TEXT NOT NULL CHECK (
    reaction_type IN ('thumbs_up', 'heart', 'laugh', 'celebrate', 'thinking', 'thumbs_down')
  ),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one reaction per user per type per comment
  CONSTRAINT unique_comment_reaction UNIQUE (comment_id, user_id, reaction_type)
);

-- Add reaction_counts JSONB column to comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS reaction_counts JSONB DEFAULT '{}'::jsonb;

-- Create indexes
CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user ON comment_reactions(user_id);
CREATE INDEX idx_comment_reactions_type ON comment_reactions(reaction_type);

-- Create function to update reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_comment_id UUID;
  v_reaction_counts JSONB;
BEGIN
  -- Get the comment_id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    v_comment_id := OLD.comment_id;
  ELSE
    v_comment_id := NEW.comment_id;
  END IF;

  -- Calculate reaction counts for this comment
  SELECT jsonb_object_agg(
    reaction_type,
    count
  ) INTO v_reaction_counts
  FROM (
    SELECT
      reaction_type,
      COUNT(*)::int as count
    FROM comment_reactions
    WHERE comment_id = v_comment_id
    GROUP BY reaction_type
  ) subquery;

  -- Update the comments table
  UPDATE comments
  SET reaction_counts = COALESCE(v_reaction_counts, '{}'::jsonb)
  WHERE id = v_comment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for reaction count updates
CREATE TRIGGER trigger_update_comment_reaction_counts_insert
  AFTER INSERT ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_counts();

CREATE TRIGGER trigger_update_comment_reaction_counts_delete
  AFTER DELETE ON comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_counts();

-- Enable RLS
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view reactions
CREATE POLICY "Comment reactions are viewable by everyone"
  ON comment_reactions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can add reactions
CREATE POLICY "Authenticated users can add reactions"
  ON comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE comment_reactions IS 'Emoji-style reactions for comments';
COMMENT ON COLUMN comment_reactions.reaction_type IS 'Type of reaction: thumbs_up, heart, laugh, celebrate, thinking, thumbs_down';
COMMENT ON COLUMN comments.reaction_counts IS 'Cached count of reactions per type';

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON comment_reactions TO authenticated;
