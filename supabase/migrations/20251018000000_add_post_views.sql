-- Create post_views table for tracking post views
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_created_at ON public.post_views(created_at);

-- Add composite index for unique views per user
CREATE INDEX IF NOT EXISTS idx_post_views_post_user ON public.post_views(post_id, user_id);

-- Enable RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_views
-- Anyone can insert a view (for tracking)
CREATE POLICY "Anyone can insert post views"
  ON public.post_views
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Users can read their own views
CREATE POLICY "Users can read their own views"
  ON public.post_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Post authors can read views on their posts
CREATE POLICY "Authors can read views on their posts"
  ON public.post_views
  FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT id FROM public.posts WHERE author_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.post_views TO authenticated, anon;
GRANT SELECT ON public.post_views TO authenticated;
