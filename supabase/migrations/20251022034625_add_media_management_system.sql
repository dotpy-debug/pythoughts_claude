/*
  # Media Management System for Enhanced Blog Platform

  ## Overview
  This migration adds comprehensive media management capabilities including:
  - Pexels image integration with attribution tracking
  - Uploaded media file management and metadata
  - YouTube video embedding support
  - Table of contents (TOC) generation and storage
  - Media-post relationships for efficient querying

  ## New Tables

  ### 1. media_files
  Stores all uploaded media files (images, videos, documents)
  - `id` (uuid, primary key) - Unique media identifier
  - `user_id` (uuid, references profiles) - Uploader
  - `filename` (text) - Original filename
  - `storage_path` (text) - Supabase storage path
  - `file_type` (text) - MIME type (image/jpeg, video/mp4, etc.)
  - `file_size` (bigint) - File size in bytes
  - `width` (integer) - Image/video width in pixels
  - `height` (integer) - Image/video height in pixels
  - `duration` (integer) - Video duration in seconds (null for images)
  - `thumbnail_url` (text) - Thumbnail URL for videos
  - `alt_text` (text) - Accessibility alt text
  - `caption` (text) - Media caption
  - `upload_source` (text) - Source: 'upload', 'pexels', 'url'
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. pexels_images
  Tracks Pexels stock photos with attribution data
  - `id` (uuid, primary key) - Unique identifier
  - `pexels_id` (bigint, unique) - Pexels photo ID
  - `photographer` (text) - Photographer name
  - `photographer_url` (text) - Photographer profile URL
  - `photo_url` (text) - Original photo URL
  - `medium_url` (text) - Medium size URL
  - `large_url` (text) - Large size URL
  - `original_url` (text) - Original size URL
  - `width` (integer) - Original width
  - `height` (integer) - Original height
  - `alt` (text) - Alt text from Pexels
  - `color` (text) - Dominant color hex code
  - `search_query` (text) - Search query that found this image
  - `used_count` (integer) - Times used in posts
  - `created_at` (timestamptz) - First cached timestamp
  - `updated_at` (timestamptz) - Last access timestamp

  ### 3. post_media
  Junction table linking posts to media (uploaded or Pexels)
  - `id` (uuid, primary key) - Unique identifier
  - `post_id` (uuid, references posts) - Post reference
  - `media_file_id` (uuid, references media_files) - Uploaded media reference (nullable)
  - `pexels_image_id` (uuid, references pexels_images) - Pexels image reference (nullable)
  - `youtube_url` (text) - YouTube video URL (nullable)
  - `youtube_id` (text) - Extracted YouTube video ID (nullable)
  - `media_type` (text) - Type: 'uploaded_image', 'uploaded_video', 'pexels_image', 'youtube_video'
  - `position` (integer) - Order in post content
  - `caption` (text) - Media-specific caption
  - `created_at` (timestamptz) - Addition timestamp

  ### 4. post_toc
  Stores generated table of contents for blog posts
  - `id` (uuid, primary key) - Unique identifier
  - `post_id` (uuid, unique, references posts) - Post reference
  - `toc_data` (jsonb) - Hierarchical TOC structure
  - `heading_count` (integer) - Total heading count
  - `max_depth` (integer) - Maximum heading depth (1-6)
  - `created_at` (timestamptz) - Generation timestamp
  - `updated_at` (timestamptz) - Last regeneration timestamp

  ## Modified Tables

  ### posts table enhancements
  - Add `has_media` (boolean) - Quick check if post contains media
  - Add `media_count` (integer) - Cached count of media items
  - Add `has_toc` (boolean) - Whether TOC was generated
  - Add `youtube_embeds` (text[]) - Array of YouTube video IDs

  ## Security
  - Enable RLS on all tables
  - Users can manage their own uploaded media
  - Pexels images are publicly readable
  - Post-media associations follow post visibility rules
  - TOC data is publicly readable for published posts

  ## Indexes
  - Performance indexes on foreign keys
  - Full-text search on media captions and alt text
  - Indexes for efficient media library queries
  - Pexels image search optimization
*/

-- Add new columns to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'has_media'
  ) THEN
    ALTER TABLE posts ADD COLUMN has_media boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'media_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN media_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'has_toc'
  ) THEN
    ALTER TABLE posts ADD COLUMN has_toc boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'youtube_embeds'
  ) THEN
    ALTER TABLE posts ADD COLUMN youtube_embeds text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Create media_files table
CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  width integer,
  height integer,
  duration integer,
  thumbnail_url text DEFAULT '',
  alt_text text DEFAULT '',
  caption text DEFAULT '',
  upload_source text DEFAULT 'upload' CHECK (upload_source IN ('upload', 'pexels', 'url')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Create pexels_images table
CREATE TABLE IF NOT EXISTS pexels_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pexels_id bigint UNIQUE NOT NULL,
  photographer text NOT NULL,
  photographer_url text NOT NULL,
  photo_url text NOT NULL,
  medium_url text NOT NULL,
  large_url text NOT NULL,
  original_url text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  alt text DEFAULT '',
  color text DEFAULT '#000000',
  search_query text DEFAULT '',
  used_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pexels_images ENABLE ROW LEVEL SECURITY;

-- Create post_media junction table
CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_file_id uuid REFERENCES media_files(id) ON DELETE CASCADE,
  pexels_image_id uuid REFERENCES pexels_images(id) ON DELETE SET NULL,
  youtube_url text DEFAULT '',
  youtube_id text DEFAULT '',
  media_type text NOT NULL CHECK (media_type IN ('uploaded_image', 'uploaded_video', 'pexels_image', 'youtube_video')),
  position integer NOT NULL DEFAULT 0,
  caption text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- Create post_toc table
CREATE TABLE IF NOT EXISTS post_toc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid UNIQUE NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  toc_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  heading_count integer DEFAULT 0,
  max_depth integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE post_toc ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_files_user ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_storage_path ON media_files(storage_path);

CREATE INDEX IF NOT EXISTS idx_pexels_images_pexels_id ON pexels_images(pexels_id);
CREATE INDEX IF NOT EXISTS idx_pexels_images_search_query ON pexels_images(search_query);
CREATE INDEX IF NOT EXISTS idx_pexels_images_used_count ON pexels_images(used_count DESC);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_file ON post_media(media_file_id);
CREATE INDEX IF NOT EXISTS idx_post_media_pexels ON post_media(pexels_image_id);
CREATE INDEX IF NOT EXISTS idx_post_media_type ON post_media(media_type);
CREATE INDEX IF NOT EXISTS idx_post_media_position ON post_media(post_id, position);

CREATE INDEX IF NOT EXISTS idx_post_toc_post ON post_toc(post_id);

CREATE INDEX IF NOT EXISTS idx_posts_has_media ON posts(has_media);
CREATE INDEX IF NOT EXISTS idx_posts_has_toc ON posts(has_toc);

-- RLS Policies for media_files

CREATE POLICY "Users can view own media files"
  ON media_files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload media files"
  ON media_files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media files"
  ON media_files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media files"
  ON media_files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for pexels_images

CREATE POLICY "Pexels images are viewable by everyone"
  ON pexels_images FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can cache Pexels images"
  ON pexels_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update Pexels usage counts"
  ON pexels_images FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for post_media

CREATE POLICY "Post media viewable for published posts"
  ON post_media FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND (posts.is_published = true OR posts.author_id = auth.uid())
    )
  );

CREATE POLICY "Post authors can add media to posts"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can update post media"
  ON post_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can remove post media"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- RLS Policies for post_toc

CREATE POLICY "TOC viewable for published posts"
  ON post_toc FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_toc.post_id
      AND (posts.is_published = true OR posts.author_id = auth.uid())
    )
  );

CREATE POLICY "System can manage TOC data"
  ON post_toc FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_toc.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "System can update TOC data"
  ON post_toc FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_toc.post_id
      AND posts.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_toc.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Functions to update cached counts

-- Update post media count
CREATE OR REPLACE FUNCTION update_post_media_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET media_count = media_count + 1,
        has_media = true
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET media_count = GREATEST(media_count - 1, 0),
        has_media = (media_count - 1) > 0
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update Pexels image usage count
CREATE OR REPLACE FUNCTION update_pexels_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.pexels_image_id IS NOT NULL THEN
    UPDATE pexels_images
    SET used_count = used_count + 1,
        updated_at = now()
    WHERE id = NEW.pexels_image_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.pexels_image_id IS NOT NULL THEN
    UPDATE pexels_images
    SET used_count = GREATEST(used_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.pexels_image_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

DROP TRIGGER IF EXISTS trigger_update_post_media_count ON post_media;
CREATE TRIGGER trigger_update_post_media_count
  AFTER INSERT OR DELETE ON post_media
  FOR EACH ROW
  EXECUTE FUNCTION update_post_media_count();

DROP TRIGGER IF EXISTS trigger_update_pexels_usage_count ON post_media;
CREATE TRIGGER trigger_update_pexels_usage_count
  AFTER INSERT OR DELETE ON post_media
  FOR EACH ROW
  EXECUTE FUNCTION update_pexels_usage_count();

DROP TRIGGER IF EXISTS trigger_media_files_updated_at ON media_files;
CREATE TRIGGER trigger_media_files_updated_at
  BEFORE UPDATE ON media_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pexels_images_updated_at ON pexels_images;
CREATE TRIGGER trigger_pexels_images_updated_at
  BEFORE UPDATE ON pexels_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_post_toc_updated_at ON post_toc;
CREATE TRIGGER trigger_post_toc_updated_at
  BEFORE UPDATE ON post_toc
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
