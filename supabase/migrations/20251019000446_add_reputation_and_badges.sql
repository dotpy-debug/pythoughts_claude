/*
  # Reputation and Badges System

  ## Overview
  Gamification system to reward user engagement and achievements with:
  - Reputation points based on quality contributions
  - Achievement badges for milestones and accomplishments
  - Automatic badge awarding via triggers

  ## New Tables
  - user_reputation: Tracks reputation points and level
  - badges: Defines available badges
  - user_badges: Junction table for earned badges

  ## Security
  - Enable RLS on all tables
  - Public can view reputation and badges
  - Users can update their own badge featured status
*/

-- Create user_reputation table
CREATE TABLE IF NOT EXISTS user_reputation (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  reputation_points integer DEFAULT 0 CHECK (reputation_points >= 0),
  level integer DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  posts_created integer DEFAULT 0,
  comments_made integer DEFAULT 0,
  upvotes_received integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '🏆',
  category text NOT NULL CHECK (category IN ('engagement', 'quality', 'milestone', 'special')),
  color text DEFAULT '#fbbf24' CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  requirement_type text NOT NULL CHECK (requirement_type IN (
    'posts_created', 'comments_made', 'upvotes_received',
    'reputation_points', 'followers_count', 'posts_bookmarked'
  )),
  requirement_value integer NOT NULL CHECK (requirement_value > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Create user_badges junction table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  is_featured boolean DEFAULT false,
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_reputation_points ON user_reputation(reputation_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON user_reputation(level DESC);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON user_badges(user_id, is_featured) WHERE is_featured = true;

-- RLS Policies
CREATE POLICY "Everyone can view user reputation"
  ON user_reputation FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Everyone can view active badges"
  ON badges FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Everyone can view user badges"
  ON user_badges FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own badge featured status"
  ON user_badges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate user level from reputation points
CREATE OR REPLACE FUNCTION calculate_user_level(points integer)
RETURNS integer AS $$
BEGIN
  IF points >= 5000 THEN RETURN 5;
  ELSIF points >= 1500 THEN RETURN 4;
  ELSIF points >= 500 THEN RETURN 3;
  ELSIF points >= 100 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  points_change integer := 0;
BEGIN
  -- Determine target user and points based on trigger type
  IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    target_user_id := NEW.author_id;
    points_change := 5;

  ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    target_user_id := NEW.author_id;
    points_change := 2;

  ELSIF TG_TABLE_NAME = 'votes' AND TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      SELECT author_id INTO target_user_id FROM posts WHERE id = NEW.post_id;
      points_change := CASE WHEN NEW.vote_type = 1 THEN 10 ELSE -2 END;
    ELSIF NEW.comment_id IS NOT NULL THEN
      SELECT author_id INTO target_user_id FROM comments WHERE id = NEW.comment_id;
      points_change := CASE WHEN NEW.vote_type = 1 THEN 5 ELSE -1 END;
    END IF;

  ELSIF TG_TABLE_NAME = 'claps' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    SELECT author_id INTO target_user_id FROM posts WHERE id = NEW.post_id;
    points_change := CASE
      WHEN TG_OP = 'INSERT' THEN NEW.clap_count
      ELSE NEW.clap_count - COALESCE(OLD.clap_count, 0)
    END;

  ELSIF TG_TABLE_NAME = 'bookmarks' AND TG_OP = 'INSERT' THEN
    SELECT author_id INTO target_user_id FROM posts WHERE id = NEW.post_id;
    points_change := 3;
  END IF;

  -- Update or insert reputation record
  IF target_user_id IS NOT NULL AND points_change != 0 THEN
    INSERT INTO user_reputation (user_id, reputation_points, level, updated_at)
    VALUES (
      target_user_id,
      points_change,
      calculate_user_level(points_change),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      reputation_points = GREATEST(user_reputation.reputation_points + points_change, 0),
      level = calculate_user_level(GREATEST(user_reputation.reputation_points + points_change, 0)),
      updated_at = now();

    -- Update activity counters
    IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
      UPDATE user_reputation SET posts_created = posts_created + 1 WHERE user_id = target_user_id;
    ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
      UPDATE user_reputation SET comments_made = comments_made + 1 WHERE user_id = target_user_id;
    ELSIF TG_TABLE_NAME = 'votes' AND NEW.vote_type = 1 THEN
      UPDATE user_reputation SET upvotes_received = upvotes_received + 1 WHERE user_id = target_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  badge_record RECORD;
  user_value integer;
BEGIN
  FOR badge_record IN
    SELECT * FROM badges WHERE is_active = true
  LOOP
    EXECUTE format('SELECT %I FROM user_reputation WHERE user_id = $1', badge_record.requirement_type)
    INTO user_value
    USING NEW.user_id;

    IF user_value >= badge_record.requirement_value THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (NEW.user_id, badge_record.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for reputation updates
DROP TRIGGER IF EXISTS trigger_reputation_on_post ON posts;
CREATE TRIGGER trigger_reputation_on_post
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

DROP TRIGGER IF EXISTS trigger_reputation_on_comment ON comments;
CREATE TRIGGER trigger_reputation_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

DROP TRIGGER IF EXISTS trigger_reputation_on_vote ON votes;
CREATE TRIGGER trigger_reputation_on_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

DROP TRIGGER IF EXISTS trigger_reputation_on_clap ON claps;
CREATE TRIGGER trigger_reputation_on_clap
  AFTER INSERT OR UPDATE ON claps
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

DROP TRIGGER IF EXISTS trigger_reputation_on_bookmark ON bookmarks;
CREATE TRIGGER trigger_reputation_on_bookmark
  AFTER INSERT ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reputation();

-- Create trigger for badge awarding
DROP TRIGGER IF EXISTS trigger_award_badges ON user_reputation;
CREATE TRIGGER trigger_award_badges
  AFTER INSERT OR UPDATE ON user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();

-- Seed default badges
INSERT INTO badges (name, description, icon, category, color, requirement_type, requirement_value) VALUES
  ('First Post', 'Published your first post', '✍️', 'milestone', '#3b82f6', 'posts_created', 1),
  ('Prolific Writer', 'Published 10 posts', '📚', 'milestone', '#8b5cf6', 'posts_created', 10),
  ('Author', 'Published 50 posts', '🖋️', 'milestone', '#6366f1', 'posts_created', 50),
  ('Conversationalist', 'Made 50 comments', '💬', 'engagement', '#10b981', 'comments_made', 50),
  ('Discussion Leader', 'Made 200 comments', '🗣️', 'engagement', '#14b8a6', 'comments_made', 200),
  ('Popular', 'Received 100 upvotes', '👍', 'quality', '#f59e0b', 'upvotes_received', 100),
  ('Influencer', 'Received 500 upvotes', '⭐', 'quality', '#ef4444', 'upvotes_received', 500),
  ('Rising Star', 'Reached 100 reputation', '🌟', 'milestone', '#fbbf24', 'reputation_points', 100),
  ('Expert', 'Reached 500 reputation', '💎', 'milestone', '#06b6d4', 'reputation_points', 500),
  ('Master', 'Reached 5000 reputation', '👑', 'milestone', '#ec4899', 'reputation_points', 5000)
ON CONFLICT (name) DO NOTHING;

-- Initialize reputation for existing users
INSERT INTO user_reputation (user_id, reputation_points, level)
SELECT
  p.id,
  0 as points,
  1
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = p.id);