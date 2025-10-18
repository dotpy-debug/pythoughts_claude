-- Create reports table for content moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure at least one of post_id or comment_id is set
  CONSTRAINT check_content_type CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON public.reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_comment_id ON public.reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Allow all authenticated users to view all reports (for moderation queue)
-- In production, you may want to restrict this to moderator role
CREATE POLICY "Authenticated users can view all reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update reports (for moderators)
-- In production, you may want to restrict this to moderator role
CREATE POLICY "Authenticated users can update reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_reports_updated_at ON public.reports;
CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();
