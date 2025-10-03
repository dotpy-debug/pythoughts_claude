/*
  # Pythoughts Database Schema - Complete Social Platform

  ## Overview
  This migration creates the complete database schema for Pythoughts, a Reddit-style social platform 
  with nested comments, live reactions, and blog functionality.

  ## New Tables

  ### 1. profiles
  Extension of auth.users for public profile information
  - `id` (uuid, references auth.users) - User ID from Supabase Auth
  - `username` (text, unique) - Display username
  - `avatar_url` (text) - Profile picture URL
  - `bio` (text) - User biography
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. posts
  Main content items for both newsfeed and blogs
  - `id` (uuid, primary key) - Unique post identifier
  - `title` (text) - Post/blog title
  - `content` (text) - Post/blog content (supports markdown)
  - `author_id` (uuid, references profiles) - Post creator
  - `post_type` (text) - Either 'news' or 'blog'
  - `image_url` (text) - Optional featured image
  - `category` (text) - Category tag (Tech, Product, Design, etc.)
  - `is_published` (boolean) - Publication status
  - `vote_count` (integer) - Cached vote total for sorting
  - `comment_count` (integer) - Cached comment count
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 3. comments
  Nested comment system with unlimited depth
  - `id` (uuid, primary key) - Unique comment identifier
  - `content` (text) - Comment text
  - `author_id` (uuid, references profiles) - Comment author
  - `post_id` (uuid, references posts) - Parent post
  - `parent_comment_id` (uuid, references comments) - Parent comment for nesting
  - `depth` (integer) - Nesting level (0 for top-level)
  - `vote_count` (integer) - Cached vote total
  - `is_deleted` (boolean) - Soft delete flag
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 4. votes
  Upvote/downvote tracking for posts and comments
  - `id` (uuid, primary key) - Unique vote identifier
  - `user_id` (uuid, references profiles) - Voter
  - `post_id` (uuid, references posts) - Voted post (nullable)
  - `comment_id` (uuid, references comments) - Voted comment (nullable)
  - `vote_type` (integer) - 1 for upvote, -1 for downvote
  - `created_at` (timestamptz) - Vote timestamp

  ### 5. reactions
  Live emoji reactions for posts and comments
  - `id` (uuid, primary key) - Unique reaction identifier
  - `user_id` (uuid, references profiles) - User who reacted
  - `post_id` (uuid, references posts) - Reacted post (nullable)
  - `comment_id` (uuid, references comments) - Reacted comment (nullable)
  - `reaction_type` (text) - Emoji type (like, love, laugh, wow, sad, angry)
  - `created_at` (timestamptz) - Reaction timestamp

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Profiles: Users can read all profiles, update only their own
  - Posts: Public read access, authenticated users can create, authors can update/delete their own
  - Comments: Public read access, authenticated users can create, authors can update/delete their own
  - Votes: Users can read all votes, manage only their own
  - Reactions: Users can read all reactions, manage only their own

  ## Indexes
  - Posts: index on author_id, post_type, created_at, vote_count for efficient sorting
  - Comments: index on post_id, parent_comment_id, created_at for thread loading
  - Votes: unique constraint on user_id + post_id/comment_id to prevent duplicate votes
  - Reactions: index on post_id, comment_id for aggregation queries

  ## Functions
  - Trigger to update vote_count on posts and comments when votes change
  - Trigger to update comment_count on posts when comments are added
  - Function to calculate "hot" score for post ranking
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('news', 'blog')),
  image_url text DEFAULT '',
  category text DEFAULT '',
  is_published boolean DEFAULT true,
  vote_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  depth integer DEFAULT 0,
  vote_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  vote_type integer NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT vote_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_post_vote UNIQUE (user_id, post_id),
  CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id)
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT reaction_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_post_reaction UNIQUE (user_id, post_id, reaction_type),
  CONSTRAINT unique_comment_reaction UNIQUE (user_id, comment_id, reaction_type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_vote_count ON posts(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_comment ON votes(comment_id);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for posts
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  TO authenticated, anon
  USING (is_published = true OR author_id = auth.uid());

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for votes
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for reactions
CREATE POLICY "Reactions are viewable by everyone"
  ON reactions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create reactions"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update post vote count
CREATE OR REPLACE FUNCTION update_post_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET vote_count = vote_count + NEW.vote_type
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET vote_count = vote_count - OLD.vote_type
    WHERE id = OLD.post_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE posts
    SET vote_count = vote_count - OLD.vote_type + NEW.vote_type
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment vote count
CREATE OR REPLACE FUNCTION update_comment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments
    SET vote_count = vote_count + NEW.vote_type
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments
    SET vote_count = vote_count - OLD.vote_type
    WHERE id = OLD.comment_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE comments
    SET vote_count = vote_count - OLD.vote_type + NEW.vote_type
    WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET comment_count = comment_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for post votes
DROP TRIGGER IF EXISTS trigger_update_post_vote_count_insert ON votes;
CREATE TRIGGER trigger_update_post_vote_count_insert
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL)
  EXECUTE FUNCTION update_post_vote_count();

DROP TRIGGER IF EXISTS trigger_update_post_vote_count_delete ON votes;
CREATE TRIGGER trigger_update_post_vote_count_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.post_id IS NOT NULL)
  EXECUTE FUNCTION update_post_vote_count();

DROP TRIGGER IF EXISTS trigger_update_post_vote_count_update ON votes;
CREATE TRIGGER trigger_update_post_vote_count_update
  AFTER UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL)
  EXECUTE FUNCTION update_post_vote_count();

-- Create triggers for comment votes
DROP TRIGGER IF EXISTS trigger_update_comment_vote_count_insert ON votes;
CREATE TRIGGER trigger_update_comment_vote_count_insert
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_vote_count();

DROP TRIGGER IF EXISTS trigger_update_comment_vote_count_delete ON votes;
CREATE TRIGGER trigger_update_comment_vote_count_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_vote_count();

DROP TRIGGER IF EXISTS trigger_update_comment_vote_count_update ON votes;
CREATE TRIGGER trigger_update_comment_vote_count_update
  AFTER UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_vote_count();

-- Create triggers for comment counts
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON comments;
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_posts_updated_at ON posts;
CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_comments_updated_at ON comments;
CREATE TRIGGER trigger_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();