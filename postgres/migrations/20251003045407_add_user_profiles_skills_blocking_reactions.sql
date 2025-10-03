/*
  # Enhanced User Profiles, Skills, Blocking, and Reactions System

  ## New Tables
  
  ### 1. user_skills
  Skills that users can add to their profiles
  - `id` (uuid, primary key) - Unique skill identifier
  - `user_id` (uuid, references profiles) - User who owns the skill
  - `skill_name` (text) - Name of the skill
  - `proficiency_level` (text) - Skill level (beginner, intermediate, advanced, expert)
  - `years_experience` (integer) - Years of experience
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 2. user_blocks
  User blocking system for content filtering
  - `id` (uuid, primary key) - Unique block identifier
  - `blocker_id` (uuid, references profiles) - User who is blocking
  - `blocked_id` (uuid, references profiles) - User who is blocked
  - `created_at` (timestamptz) - Block timestamp
  
  ### 3. post_reactions
  Emoji reactions for posts (extended from existing reactions table)
  - Extends the existing reactions table with more emoji types
  - Added reaction types: heart, fire, clap, thinking, celebrate, rocket
  
  ### 4. user_profile_extended
  Extended profile information
  - `user_id` (uuid, references profiles) - User identifier
  - `bio_extended` (text) - Extended biography
  - `website` (text) - Personal website URL
  - `location` (text) - User location
  - `company` (text) - Current company
  - `job_title` (text) - Current job title
  - `github_url` (text) - GitHub profile URL
  - `twitter_url` (text) - Twitter profile URL
  - `linkedin_url` (text) - LinkedIn profile URL
  - `total_posts` (integer) - Cached total posts count
  - `total_followers` (integer) - Cached followers count
  - `total_following` (integer) - Cached following count
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 5. user_follows
  User following system
  - `id` (uuid, primary key) - Unique follow identifier
  - `follower_id` (uuid, references profiles) - User who is following
  - `following_id` (uuid, references profiles) - User being followed
  - `created_at` (timestamptz) - Follow timestamp
  
  ## Security
  - Enable RLS on all tables
  - Users can manage their own skills and profile
  - Users can block/unblock other users
  - Blocked users cannot see each other's content
  - All users can view public profiles and skills
  
  ## Indexes
  - Index on user_id for fast profile queries
  - Unique constraints on blocking relationships
  - Composite indexes for efficient queries
*/

CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency_level text NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_profile_extended (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio_extended text DEFAULT '',
  website text DEFAULT '',
  location text DEFAULT '',
  company text DEFAULT '',
  job_title text DEFAULT '',
  github_url text DEFAULT '',
  twitter_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  total_posts integer DEFAULT 0,
  total_followers integer DEFAULT 0,
  total_following integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profile_extended ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reactions' AND column_name = 'reaction_type'
  ) THEN
    ALTER TABLE reactions 
    DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;
    
    ALTER TABLE reactions 
    ADD CONSTRAINT reactions_reaction_type_check 
    CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'heart', 'fire', 'clap', 'thinking', 'celebrate', 'rocket'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

CREATE POLICY "Users can view all skills"
  ON user_skills FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can manage own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view blocks they created"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view all profiles"
  ON user_profile_extended FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create own extended profile"
  ON user_profile_extended FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own extended profile"
  ON user_profile_extended FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all follows"
  ON user_follows FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create follows"
  ON user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION update_user_profile_extended_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profile_extended_updated_at ON user_profile_extended;
CREATE TRIGGER trigger_user_profile_extended_updated_at
  BEFORE UPDATE ON user_profile_extended
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_extended_updated_at();

CREATE OR REPLACE FUNCTION check_user_not_blocked(target_user_id uuid, viewing_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = target_user_id AND blocked_id = viewing_user_id)
       OR (blocker_id = viewing_user_id AND blocked_id = target_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;