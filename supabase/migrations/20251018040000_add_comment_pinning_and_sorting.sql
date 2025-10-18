-- Add comment pinning and sorting features
-- This migration adds the ability for post authors to pin important comments
-- and provides better sorting options for comment display

-- Add is_pinned column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for pinned comments for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_post_pinned_votes
ON public.comments(post_id, is_pinned DESC, vote_count DESC, created_at DESC);

-- Create a function to check if user is post author
CREATE OR REPLACE FUNCTION is_post_author(post_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = post_uuid AND author_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_post_author(UUID, UUID) TO authenticated;

-- Add RLS policy for pinning comments (only post authors can pin)
-- Note: We don't add a separate pin/unpin policy since UPDATE policy handles this

-- Update the comments UPDATE policy to allow post authors to pin/unpin comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR is_post_author(post_id, auth.uid())
)
WITH CHECK (
  auth.uid() = author_id OR is_post_author(post_id, auth.uid())
);

-- Add comment to explain the pinning feature
COMMENT ON COLUMN public.comments.is_pinned IS 'Indicates if a comment is pinned by the post author. Pinned comments appear at the top of the comment section.';
