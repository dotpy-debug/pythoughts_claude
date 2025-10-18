-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure a user can only bookmark a post once
  UNIQUE(user_id, post_id)
);

-- Create reading_lists table
CREATE TABLE IF NOT EXISTS public.reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT reading_list_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  -- Ensure slug is unique per user
  UNIQUE(user_id, slug)
);

-- Create reading_list_items junction table
CREATE TABLE IF NOT EXISTS public.reading_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_list_id UUID NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,

  -- Ensure a post can only be added once to a reading list
  UNIQUE(reading_list_id, post_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user_id ON public.reading_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_lists_slug ON public.reading_lists(slug);
CREATE INDEX IF NOT EXISTS idx_reading_lists_is_public ON public.reading_lists(is_public);

CREATE INDEX IF NOT EXISTS idx_reading_list_items_list_id ON public.reading_list_items(reading_list_id);
CREATE INDEX IF NOT EXISTS idx_reading_list_items_post_id ON public.reading_list_items(post_id);

-- Enable RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookmarks
-- Users can view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own bookmarks
CREATE POLICY "Users can create their own bookmarks"
  ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reading_lists
-- Users can view their own reading lists
CREATE POLICY "Users can view their own reading lists"
  ON public.reading_lists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can view public reading lists
CREATE POLICY "Anyone can view public reading lists"
  ON public.reading_lists
  FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- Users can create their own reading lists
CREATE POLICY "Users can create their own reading lists"
  ON public.reading_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reading lists
CREATE POLICY "Users can update their own reading lists"
  ON public.reading_lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reading lists
CREATE POLICY "Users can delete their own reading lists"
  ON public.reading_lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reading_list_items
-- Users can view items in their own reading lists
CREATE POLICY "Users can view their own reading list items"
  ON public.reading_list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.user_id = auth.uid()
    )
  );

-- Anyone can view items in public reading lists
CREATE POLICY "Anyone can view public reading list items"
  ON public.reading_list_items
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.is_public = true
    )
  );

-- Users can add items to their own reading lists
CREATE POLICY "Users can add items to their own reading lists"
  ON public.reading_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.user_id = auth.uid()
    )
  );

-- Users can update items in their own reading lists
CREATE POLICY "Users can update their own reading list items"
  ON public.reading_list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.user_id = auth.uid()
    )
  );

-- Users can delete items from their own reading lists
CREATE POLICY "Users can delete their own reading list items"
  ON public.reading_list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reading_lists
      WHERE reading_lists.id = reading_list_id
      AND reading_lists.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT ON public.bookmarks TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_lists TO authenticated;
GRANT SELECT ON public.reading_lists TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_list_items TO authenticated;
GRANT SELECT ON public.reading_list_items TO anon;

-- Create function to update reading_lists updated_at
CREATE OR REPLACE FUNCTION update_reading_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_reading_lists_updated_at ON public.reading_lists;
CREATE TRIGGER trigger_reading_lists_updated_at
  BEFORE UPDATE ON public.reading_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_lists_updated_at();

-- Create function to auto-generate slug for reading lists
CREATE OR REPLACE FUNCTION generate_reading_list_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '^-|-$', '', 'g');

    -- Ensure uniqueness by appending a number if needed
    DECLARE
      base_slug TEXT := NEW.slug;
      counter INTEGER := 1;
    BEGIN
      WHILE EXISTS (
        SELECT 1 FROM public.reading_lists
        WHERE user_id = NEW.user_id
        AND slug = NEW.slug
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      ) LOOP
        NEW.slug := base_slug || '-' || counter;
        counter := counter + 1;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for slug generation
DROP TRIGGER IF EXISTS trigger_generate_reading_list_slug ON public.reading_lists;
CREATE TRIGGER trigger_generate_reading_list_slug
  BEFORE INSERT OR UPDATE ON public.reading_lists
  FOR EACH ROW
  EXECUTE FUNCTION generate_reading_list_slug();
