-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Default gray color
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT tag_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 30),
  CONSTRAINT tag_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Create post_tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure a post can only have one instance of each tag
  UNIQUE(post_id, tag_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON public.post_tags(tag_id);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
-- Anyone can view tags
CREATE POLICY "Anyone can view tags"
  ON public.tags
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can create tags
CREATE POLICY "Authenticated users can create tags"
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update tags they created
-- For now, allow all authenticated users to update tags
CREATE POLICY "Authenticated users can update tags"
  ON public.tags
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for post_tags
-- Anyone can view post-tag relationships
CREATE POLICY "Anyone can view post tags"
  ON public.post_tags
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Post authors can add tags to their posts
CREATE POLICY "Authors can add tags to their posts"
  ON public.post_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Post authors can remove tags from their posts
CREATE POLICY "Authors can remove tags from their posts"
  ON public.post_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON public.tags TO authenticated, anon;
GRANT INSERT, UPDATE ON public.tags TO authenticated;
GRANT SELECT ON public.post_tags TO authenticated, anon;
GRANT INSERT, DELETE ON public.post_tags TO authenticated;

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags
    SET usage_count = usage_count - 1
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update tag usage count
DROP TRIGGER IF EXISTS trigger_update_tag_usage_count ON public.post_tags;
CREATE TRIGGER trigger_update_tag_usage_count
  AFTER INSERT OR DELETE ON public.post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_tags_updated_at ON public.tags;
CREATE TRIGGER trigger_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tags_updated_at();

-- Insert some default popular tags
INSERT INTO public.tags (name, slug, description, color) VALUES
  ('JavaScript', 'javascript', 'JavaScript programming language and frameworks', '#F7DF1E'),
  ('Python', 'python', 'Python programming language and libraries', '#3776AB'),
  ('React', 'react', 'React.js library and ecosystem', '#61DAFB'),
  ('TypeScript', 'typescript', 'TypeScript programming language', '#3178C6'),
  ('Web Development', 'web-development', 'General web development topics', '#E34F26'),
  ('Backend', 'backend', 'Server-side development and APIs', '#339933'),
  ('Frontend', 'frontend', 'Client-side development and UI', '#FF6384'),
  ('DevOps', 'devops', 'Development operations and deployment', '#326CE5'),
  ('Database', 'database', 'Database design and management', '#4479A1'),
  ('AI/ML', 'ai-ml', 'Artificial Intelligence and Machine Learning', '#FF6F00'),
  ('Tutorial', 'tutorial', 'Step-by-step guides and tutorials', '#9B59B6'),
  ('Career', 'career', 'Career advice and professional development', '#27AE60'),
  ('Open Source', 'open-source', 'Open source projects and contributions', '#2ECC71'),
  ('Best Practices', 'best-practices', 'Code quality and best practices', '#E67E22'),
  ('News', 'news', 'Tech news and industry updates', '#E74C3C')
ON CONFLICT (slug) DO NOTHING;
