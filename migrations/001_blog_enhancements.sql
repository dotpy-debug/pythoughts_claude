-- Blog Enhancement Migration
-- Version: 1.0
-- Date: 2025-10-26
-- Description: Add blog-specific columns and tables for enhanced blog experience

-- Blog posts enhanced schema
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_json JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS toc_data JSONB DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_alt TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_title VARCHAR(100);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_description VARCHAR(260);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_reading_time ON posts(reading_time_minutes);

-- Blog series table
CREATE TABLE IF NOT EXISTS blog_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  author_id UUID REFERENCES profiles(id),
  post_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link posts to series
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES blog_series(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS series_order INTEGER;

-- TOC analytics tracking
CREATE TABLE IF NOT EXISTS toc_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  heading_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'click', 'view', 'scroll_past'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_toc_interactions_post ON toc_interactions(post_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_toc_interactions_user ON toc_interactions(user_id, timestamp);

-- Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  progress_percentage INTEGER DEFAULT 0,
  last_position VARCHAR(100), -- heading ID where they stopped
  reading_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments with threading (extends existing comments)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON post_comments(parent_id);
