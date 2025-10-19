/*
  # Content Versioning System for Posts

  ## Overview
  Creates a versioning system to track post edit history, allowing users to:
  - View complete edit history of posts
  - Compare different versions
  - Restore previous versions
  - Track who made changes and when

  ## New Table: post_versions
  Tracks all versions of published posts with full content history

  ## Security
  - Enable RLS
  - Post authors can view their own post versions
  - Anyone can view versions of published posts (transparency)
  - Only post authors can create versions
*/

-- Create post_versions table
CREATE TABLE IF NOT EXISTS post_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  subtitle text DEFAULT '',
  image_url text DEFAULT '',
  category text DEFAULT '',
  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  change_description text DEFAULT '',
  is_major_edit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_post_version UNIQUE (post_id, version_number)
);

-- Enable RLS
ALTER TABLE post_versions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_versions_post_id ON post_versions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_version_number ON post_versions(post_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_created_at ON post_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_versions_changed_by ON post_versions(changed_by);

-- RLS Policies
CREATE POLICY "Authors can view own post versions"
  ON post_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_versions.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view versions of published posts"
  ON post_versions FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_versions.post_id
      AND posts.is_published = true
      AND posts.is_draft = false
    )
  );

CREATE POLICY "System can create versions"
  ON post_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_versions.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Function to create a new version when a post is updated
CREATE OR REPLACE FUNCTION create_post_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version_number integer;
  is_major boolean;
BEGIN
  -- Only create versions for published posts that are being updated
  IF TG_OP = 'UPDATE' AND NEW.is_published = true THEN
    -- Check if this is a significant change
    is_major := (
      OLD.title != NEW.title OR
      LENGTH(OLD.content) != LENGTH(NEW.content) OR
      OLD.category != NEW.category
    );

    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version_number
    FROM post_versions
    WHERE post_id = NEW.id;

    -- Create the version record with OLD values (before the update)
    INSERT INTO post_versions (
      post_id,
      version_number,
      title,
      content,
      subtitle,
      image_url,
      category,
      changed_by,
      is_major_edit,
      created_at
    ) VALUES (
      NEW.id,
      next_version_number,
      OLD.title,
      OLD.content,
      OLD.subtitle,
      OLD.image_url,
      OLD.category,
      auth.uid(),
      is_major,
      OLD.updated_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically version posts on update
DROP TRIGGER IF EXISTS trigger_create_post_version ON posts;
CREATE TRIGGER trigger_create_post_version
  BEFORE UPDATE ON posts
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.content IS DISTINCT FROM NEW.content OR
    OLD.subtitle IS DISTINCT FROM NEW.subtitle OR
    OLD.image_url IS DISTINCT FROM NEW.image_url OR
    OLD.category IS DISTINCT FROM NEW.category
  )
  EXECUTE FUNCTION create_post_version();

-- Function to get version count for a post
CREATE OR REPLACE FUNCTION get_post_version_count(p_post_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM post_versions
  WHERE post_id = p_post_id;
$$ LANGUAGE sql STABLE;

-- Function to restore a specific version of a post
CREATE OR REPLACE FUNCTION restore_post_version(
  p_post_id uuid,
  p_version_number integer,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_version RECORD;
  v_is_author boolean;
BEGIN
  -- Check if user is the post author
  SELECT EXISTS (
    SELECT 1 FROM posts
    WHERE id = p_post_id
    AND author_id = p_user_id
  ) INTO v_is_author;

  IF NOT v_is_author THEN
    RAISE EXCEPTION 'Only the post author can restore versions';
  END IF;

  -- Get the version to restore
  SELECT * INTO v_version
  FROM post_versions
  WHERE post_id = p_post_id
  AND version_number = p_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Update the post with the version data
  UPDATE posts
  SET
    title = v_version.title,
    content = v_version.content,
    subtitle = v_version.subtitle,
    image_url = v_version.image_url,
    category = v_version.category,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial versions for existing published posts
INSERT INTO post_versions (
  post_id,
  version_number,
  title,
  content,
  subtitle,
  image_url,
  category,
  changed_by,
  is_major_edit,
  created_at
)
SELECT
  p.id,
  1,
  p.title,
  p.content,
  p.subtitle,
  p.image_url,
  p.category,
  p.author_id,
  true,
  p.created_at
FROM posts p
WHERE p.is_published = true
AND NOT EXISTS (
  SELECT 1 FROM post_versions pv
  WHERE pv.post_id = p.id
)
ON CONFLICT (post_id, version_number) DO NOTHING;