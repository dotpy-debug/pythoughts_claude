/*
  # Medium.com Complete Blogging System Features
  
  ## Overview
  This migration adds all essential Medium.com blogging features to transform the platform
  into a full-featured blogging system with drafts, claps, bookmarks, highlights, series,
  publications, and advanced content discovery.

  ## New Tables

  ### 1. post_drafts
  Draft management system for unpublished content
  - `id` (uuid, primary key) - Unique draft identifier
  - `title` (text) - Draft title
  - `content` (text) - Draft content in markdown/rich text
  - `author_id` (uuid, references profiles) - Draft author
  - `post_type` (text) - Type: 'blog' or 'news'
  - `image_url` (text) - Featured image URL
  - `category` (text) - Post category
  - `tags` (text[]) - Array of tag names
  - `series_id` (uuid, references series) - Series this draft belongs to
  - `publication_id` (uuid, references publications) - Publication draft belongs to
  - `scheduled_publish_at` (timestamptz) - Scheduled publication time
  - `auto_saved_at` (timestamptz) - Last auto-save timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. claps
  Medium-style claps system (users can give multiple claps to posts)
  - `id` (uuid, primary key) - Unique clap identifier
  - `user_id` (uuid, references profiles) - User who clapped
  - `post_id` (uuid, references posts) - Post that was clapped
  - `clap_count` (integer) - Number of claps given (1-50)
  - `created_at` (timestamptz) - First clap timestamp
  - `updated_at` (timestamptz) - Last clap timestamp

  ### 3. bookmarks
  Save posts for later reading
  - `id` (uuid, primary key) - Unique bookmark identifier
  - `user_id` (uuid, references profiles) - User who bookmarked
  - `post_id` (uuid, references posts) - Bookmarked post
  - `reading_list_id` (uuid, references reading_lists) - Optional reading list
  - `notes` (text) - Private notes about the bookmark
  - `created_at` (timestamptz) - Bookmark timestamp

  ### 4. reading_lists
  Custom reading lists for organizing bookmarks
  - `id` (uuid, primary key) - Unique list identifier
  - `user_id` (uuid, references profiles) - List owner
  - `name` (text) - List name
  - `description` (text) - List description
  - `is_public` (boolean) - Public/private visibility
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. highlights
  Text highlighting and annotations within posts
  - `id` (uuid, primary key) - Unique highlight identifier
  - `user_id` (uuid, references profiles) - User who highlighted
  - `post_id` (uuid, references posts) - Post containing the highlight
  - `highlighted_text` (text) - The actual highlighted text
  - `start_offset` (integer) - Character offset where highlight starts
  - `end_offset` (integer) - Character offset where highlight ends
  - `color` (text) - Highlight color (yellow, green, blue, pink)
  - `note` (text) - Private note attached to highlight
  - `is_public` (boolean) - Public/private visibility
  - `created_at` (timestamptz) - Highlight timestamp

  ### 6. series
  Blog post series for grouping related content
  - `id` (uuid, primary key) - Unique series identifier
  - `author_id` (uuid, references profiles) - Series creator
  - `name` (text) - Series name
  - `description` (text) - Series description
  - `slug` (text, unique) - URL-friendly series identifier
  - `cover_image_url` (text) - Series cover image
  - `is_published` (boolean) - Visibility status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. series_posts
  Junction table linking posts to series with ordering
  - `id` (uuid, primary key) - Unique identifier
  - `series_id` (uuid, references series) - Series identifier
  - `post_id` (uuid, references posts) - Post identifier
  - `order_index` (integer) - Position in series
  - `created_at` (timestamptz) - Addition timestamp

  ### 8. publications
  Collaborative blogs (like Medium publications)
  - `id` (uuid, primary key) - Unique publication identifier
  - `name` (text) - Publication name
  - `description` (text) - Publication description
  - `slug` (text, unique) - URL-friendly identifier
  - `logo_url` (text) - Publication logo
  - `cover_image_url` (text) - Cover image
  - `owner_id` (uuid, references profiles) - Publication owner
  - `is_public` (boolean) - Public/private status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 9. publication_members
  Publication team members with roles
  - `id` (uuid, primary key) - Unique identifier
  - `publication_id` (uuid, references publications) - Publication
  - `user_id` (uuid, references profiles) - Member
  - `role` (text) - Role: owner, editor, writer
  - `joined_at` (timestamptz) - Membership timestamp

  ### 10. publication_submissions
  Post submissions to publications
  - `id` (uuid, primary key) - Unique identifier
  - `publication_id` (uuid, references publications) - Target publication
  - `post_id` (uuid, references posts) - Submitted post
  - `author_id` (uuid, references profiles) - Submitter
  - `status` (text) - Status: pending, approved, rejected
  - `reviewer_id` (uuid, references profiles) - Reviewer
  - `review_notes` (text) - Review feedback
  - `submitted_at` (timestamptz) - Submission timestamp
  - `reviewed_at` (timestamptz) - Review timestamp

  ### 11. tags
  Content tags for categorization and discovery
  - `id` (uuid, primary key) - Unique tag identifier
  - `name` (text, unique) - Tag name
  - `slug` (text, unique) - URL-friendly identifier
  - `description` (text) - Tag description
  - `follower_count` (integer) - Cached follower count
  - `post_count` (integer) - Cached post count
  - `created_at` (timestamptz) - Creation timestamp

  ### 12. post_tags
  Junction table linking posts to tags
  - `id` (uuid, primary key) - Unique identifier
  - `post_id` (uuid, references posts) - Post identifier
  - `tag_id` (uuid, references tags) - Tag identifier
  - `created_at` (timestamptz) - Addition timestamp

  ### 13. tag_follows
  User tag following for personalized feeds
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references profiles) - Follower
  - `tag_id` (uuid, references tags) - Followed tag
  - `created_at` (timestamptz) - Follow timestamp

  ### 14. reading_progress
  Track reading position and completion
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references profiles) - Reader
  - `post_id` (uuid, references posts) - Post being read
  - `progress_percentage` (integer) - Progress 0-100
  - `last_position` (integer) - Last scroll position
  - `completed` (boolean) - Finished reading
  - `reading_time_seconds` (integer) - Time spent reading
  - `created_at` (timestamptz) - First read timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 15. post_views
  Track post views for analytics
  - `id` (uuid, primary key) - Unique identifier
  - `post_id` (uuid, references posts) - Viewed post
  - `user_id` (uuid, references profiles) - Viewer (nullable for anonymous)
  - `referrer` (text) - Traffic source
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz) - View timestamp

  ### 16. post_stats
  Cached statistics for posts
  - `post_id` (uuid, primary key, references posts) - Post identifier
  - `view_count` (integer) - Total views
  - `read_count` (integer) - Completed reads
  - `clap_count` (integer) - Total claps
  - `bookmark_count` (integer) - Bookmark count
  - `highlight_count` (integer) - Highlight count
  - `avg_read_time_seconds` (integer) - Average reading time
  - `engagement_score` (numeric) - Calculated engagement metric
  - `updated_at` (timestamptz) - Last stats update

  ## Modified Tables

  ### posts table modifications
  - Add `is_draft` (boolean) - Draft status
  - Add `published_at` (timestamptz) - Publication timestamp
  - Add `reading_time_minutes` (integer) - Estimated reading time
  - Add `subtitle` (text) - Post subtitle/excerpt
  - Add `seo_title` (text) - SEO-optimized title
  - Add `seo_description` (text) - SEO meta description
  - Add `canonical_url` (text) - Canonical URL for SEO
  - Add `featured` (boolean) - Featured/staff pick status

  ## Security
  - Enable RLS on all new tables
  - Users can manage their own drafts, bookmarks, highlights
  - Publication owners/editors can manage publication content
  - Public posts are viewable by everyone
  - Private reading lists and highlights are user-only

  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Full-text search indexes on post content and titles
  - Composite indexes for efficient filtering and sorting
*/

-- Add new columns to existing posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE posts ADD COLUMN is_draft boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE posts ADD COLUMN published_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'reading_time_minutes'
  ) THEN
    ALTER TABLE posts ADD COLUMN reading_time_minutes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'subtitle'
  ) THEN
    ALTER TABLE posts ADD COLUMN subtitle text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'seo_title'
  ) THEN
    ALTER TABLE posts ADD COLUMN seo_title text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'seo_description'
  ) THEN
    ALTER TABLE posts ADD COLUMN seo_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'canonical_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN canonical_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'featured'
  ) THEN
    ALTER TABLE posts ADD COLUMN featured boolean DEFAULT false;
  END IF;
END $$;

-- Create series table
CREATE TABLE IF NOT EXISTS series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  slug text UNIQUE NOT NULL,
  cover_image_url text DEFAULT '',
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- Create publications table
CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  slug text UNIQUE NOT NULL,
  logo_url text DEFAULT '',
  cover_image_url text DEFAULT '',
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- Create post_drafts table
CREATE TABLE IF NOT EXISTS post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  content text DEFAULT '',
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type text DEFAULT 'blog' CHECK (post_type IN ('news', 'blog')),
  image_url text DEFAULT '',
  category text DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  publication_id uuid REFERENCES publications(id) ON DELETE SET NULL,
  scheduled_publish_at timestamptz,
  auto_saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- Create claps table
CREATE TABLE IF NOT EXISTS claps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  clap_count integer DEFAULT 1 CHECK (clap_count >= 1 AND clap_count <= 50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_post_clap UNIQUE (user_id, post_id)
);

ALTER TABLE claps ENABLE ROW LEVEL SECURITY;

-- Create reading_lists table
CREATE TABLE IF NOT EXISTS reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reading_lists ENABLE ROW LEVEL SECURITY;

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reading_list_id uuid REFERENCES reading_lists(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_post_bookmark UNIQUE (user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  highlighted_text text NOT NULL,
  start_offset integer NOT NULL,
  end_offset integer NOT NULL,
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple')),
  note text DEFAULT '',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Create series_posts junction table
CREATE TABLE IF NOT EXISTS series_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_series_post UNIQUE (series_id, post_id)
);

ALTER TABLE series_posts ENABLE ROW LEVEL SECURITY;

-- Create publication_members table
CREATE TABLE IF NOT EXISTS publication_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'writer')),
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT unique_publication_member UNIQUE (publication_id, user_id)
);

ALTER TABLE publication_members ENABLE ROW LEVEL SECURITY;

-- Create publication_submissions table
CREATE TABLE IF NOT EXISTS publication_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text DEFAULT '',
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE publication_submissions ENABLE ROW LEVEL SECURITY;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  follower_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create post_tags junction table
CREATE TABLE IF NOT EXISTS post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_post_tag UNIQUE (post_id, tag_id)
);

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- Create tag_follows table
CREATE TABLE IF NOT EXISTS tag_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_tag_follow UNIQUE (user_id, tag_id)
);

ALTER TABLE tag_follows ENABLE ROW LEVEL SECURITY;

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_position integer DEFAULT 0,
  completed boolean DEFAULT false,
  reading_time_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_post_progress UNIQUE (user_id, post_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- Create post_views table
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  referrer text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Create post_stats table
CREATE TABLE IF NOT EXISTS post_stats (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  view_count integer DEFAULT 0,
  read_count integer DEFAULT 0,
  clap_count integer DEFAULT 0,
  bookmark_count integer DEFAULT 0,
  highlight_count integer DEFAULT 0,
  avg_read_time_seconds integer DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE post_stats ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON posts(is_draft);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured);

CREATE INDEX IF NOT EXISTS idx_post_drafts_author ON post_drafts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_drafts_updated ON post_drafts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_claps_post ON claps(post_id);
CREATE INDEX IF NOT EXISTS idx_claps_user ON claps(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_list ON bookmarks(reading_list_id);

CREATE INDEX IF NOT EXISTS idx_highlights_user ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_post ON highlights(post_id);

CREATE INDEX IF NOT EXISTS idx_series_author ON series(author_id);
CREATE INDEX IF NOT EXISTS idx_series_slug ON series(slug);

CREATE INDEX IF NOT EXISTS idx_series_posts_series ON series_posts(series_id);
CREATE INDEX IF NOT EXISTS idx_series_posts_post ON series_posts(post_id);

CREATE INDEX IF NOT EXISTS idx_publications_owner ON publications(owner_id);
CREATE INDEX IF NOT EXISTS idx_publications_slug ON publications(slug);

CREATE INDEX IF NOT EXISTS idx_publication_members_publication ON publication_members(publication_id);
CREATE INDEX IF NOT EXISTS idx_publication_members_user ON publication_members(user_id);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_tag_follows_user ON tag_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_follows_tag ON tag_follows(tag_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_post ON reading_progress(post_id);

CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_created ON post_views(created_at DESC);

-- RLS Policies for post_drafts
CREATE POLICY "Users can view own drafts"
  ON post_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can create own drafts"
  ON post_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own drafts"
  ON post_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own drafts"
  ON post_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for claps
CREATE POLICY "Claps are viewable by everyone"
  ON claps FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create claps"
  ON claps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claps"
  ON claps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own claps"
  ON claps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reading_lists
CREATE POLICY "Users can view own lists and public lists"
  ON reading_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own lists"
  ON reading_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON reading_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON reading_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for highlights
CREATE POLICY "Public highlights are viewable by everyone"
  ON highlights FOR SELECT
  TO authenticated, anon
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own highlights"
  ON highlights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON highlights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON highlights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for series
CREATE POLICY "Published series are viewable by everyone"
  ON series FOR SELECT
  TO authenticated, anon
  USING (is_published = true OR auth.uid() = author_id);

CREATE POLICY "Users can create own series"
  ON series FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own series"
  ON series FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own series"
  ON series FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for series_posts
CREATE POLICY "Series posts are viewable by everyone"
  ON series_posts FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Series authors can manage series posts"
  ON series_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = series_posts.series_id
      AND series.author_id = auth.uid()
    )
  );

CREATE POLICY "Series authors can delete series posts"
  ON series_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = series_posts.series_id
      AND series.author_id = auth.uid()
    )
  );

-- RLS Policies for publications
CREATE POLICY "Public publications are viewable by everyone"
  ON publications FOR SELECT
  TO authenticated, anon
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create publications"
  ON publications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update publications"
  ON publications FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete publications"
  ON publications FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for publication_members
CREATE POLICY "Publication members are viewable by everyone"
  ON publication_members FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Publication owners can manage members"
  ON publication_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_members.publication_id
      AND publications.owner_id = auth.uid()
    )
  );

CREATE POLICY "Publication owners can remove members"
  ON publication_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM publications
      WHERE publications.id = publication_members.publication_id
      AND publications.owner_id = auth.uid()
    )
  );

-- RLS Policies for tags
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for post_tags
CREATE POLICY "Post tags are viewable by everyone"
  ON post_tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Post authors can manage post tags"
  ON post_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Post authors can delete post tags"
  ON post_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_tags.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- RLS Policies for tag_follows
CREATE POLICY "Tag follows are viewable by everyone"
  ON tag_follows FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can follow tags"
  ON tag_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow tags"
  ON tag_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reading_progress
CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reading progress"
  ON reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON reading_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for post_views
CREATE POLICY "Everyone can create post views"
  ON post_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Post views are viewable by post authors"
  ON post_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_views.post_id
      AND posts.author_id = auth.uid()
    )
  );

-- RLS Policies for post_stats
CREATE POLICY "Post stats are viewable by everyone"
  ON post_stats FOR SELECT
  TO authenticated, anon
  USING (true);

-- Functions to update cached counts

-- Function to update clap count in post_stats
CREATE OR REPLACE FUNCTION update_post_clap_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO post_stats (post_id, clap_count, updated_at)
    VALUES (NEW.post_id, NEW.clap_count, now())
    ON CONFLICT (post_id)
    DO UPDATE SET 
      clap_count = post_stats.clap_count - COALESCE(OLD.clap_count, 0) + NEW.clap_count,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats
    SET clap_count = clap_count - OLD.clap_count,
        updated_at = now()
    WHERE post_id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update bookmark count
CREATE OR REPLACE FUNCTION update_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_stats (post_id, bookmark_count, updated_at)
    VALUES (NEW.post_id, 1, now())
    ON CONFLICT (post_id)
    DO UPDATE SET 
      bookmark_count = post_stats.bookmark_count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats
    SET bookmark_count = bookmark_count - 1,
        updated_at = now()
    WHERE post_id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update highlight count
CREATE OR REPLACE FUNCTION update_post_highlight_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_stats (post_id, highlight_count, updated_at)
    VALUES (NEW.post_id, 1, now())
    ON CONFLICT (post_id)
    DO UPDATE SET 
      highlight_count = post_stats.highlight_count + 1,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_stats
    SET highlight_count = highlight_count - 1,
        updated_at = now()
    WHERE post_id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update view count
CREATE OR REPLACE FUNCTION update_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO post_stats (post_id, view_count, updated_at)
  VALUES (NEW.post_id, 1, now())
  ON CONFLICT (post_id)
  DO UPDATE SET 
    view_count = post_stats.view_count + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update tag follower count
CREATE OR REPLACE FUNCTION update_tag_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET follower_count = follower_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET follower_count = follower_count - 1
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update tag post count
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags
    SET post_count = post_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags
    SET post_count = post_count - 1
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Average reading speed: 200-250 words per minute
  -- We'll use 225 words per minute
  NEW.reading_time_minutes := CEIL(
    (LENGTH(NEW.content) - LENGTH(REPLACE(NEW.content, ' ', '')) + 1) / 225.0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

DROP TRIGGER IF EXISTS trigger_update_post_clap_count ON claps;
CREATE TRIGGER trigger_update_post_clap_count
  AFTER INSERT OR UPDATE OR DELETE ON claps
  FOR EACH ROW
  EXECUTE FUNCTION update_post_clap_count();

DROP TRIGGER IF EXISTS trigger_update_post_bookmark_count ON bookmarks;
CREATE TRIGGER trigger_update_post_bookmark_count
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_post_bookmark_count();

DROP TRIGGER IF EXISTS trigger_update_post_highlight_count ON highlights;
CREATE TRIGGER trigger_update_post_highlight_count
  AFTER INSERT OR DELETE ON highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_post_highlight_count();

DROP TRIGGER IF EXISTS trigger_update_post_view_count ON post_views;
CREATE TRIGGER trigger_update_post_view_count
  AFTER INSERT ON post_views
  FOR EACH ROW
  EXECUTE FUNCTION update_post_view_count();

DROP TRIGGER IF EXISTS trigger_update_tag_follower_count ON tag_follows;
CREATE TRIGGER trigger_update_tag_follower_count
  AFTER INSERT OR DELETE ON tag_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_follower_count();

DROP TRIGGER IF EXISTS trigger_update_tag_post_count ON post_tags;
CREATE TRIGGER trigger_update_tag_post_count
  AFTER INSERT OR DELETE ON post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_post_count();

DROP TRIGGER IF EXISTS trigger_calculate_reading_time ON posts;
CREATE TRIGGER trigger_calculate_reading_time
  BEFORE INSERT OR UPDATE OF content ON posts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reading_time();

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS trigger_series_updated_at ON series;
CREATE TRIGGER trigger_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_publications_updated_at ON publications;
CREATE TRIGGER trigger_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_post_drafts_updated_at ON post_drafts;
CREATE TRIGGER trigger_post_drafts_updated_at
  BEFORE UPDATE ON post_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reading_lists_updated_at ON reading_lists;
CREATE TRIGGER trigger_reading_lists_updated_at
  BEFORE UPDATE ON reading_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_claps_updated_at ON claps;
CREATE TRIGGER trigger_claps_updated_at
  BEFORE UPDATE ON claps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reading_progress_updated_at ON reading_progress;
CREATE TRIGGER trigger_reading_progress_updated_at
  BEFORE UPDATE ON reading_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();