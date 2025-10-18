-- ============================================================================
-- Section 10: Publication and Collaboration Features - Database Schema
-- Date: 2025-10-19
-- Description: Publications system for collaborative blogging with members,
--              submissions, newsletters, and revenue sharing
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PUBLICATIONS TABLE
-- Core publication entity with branding and configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  logo_url text,
  cover_image_url text,

  -- Branding
  primary_color text DEFAULT '#b94a12',
  accent_color text DEFAULT '#0f1c28',
  custom_css text,

  -- Configuration
  is_public boolean DEFAULT true,
  allow_submissions boolean DEFAULT true,
  require_approval boolean DEFAULT true,
  allow_cross_posting boolean DEFAULT true,
  enable_newsletter boolean DEFAULT false,

  -- Social Links
  website_url text,
  twitter_handle text,
  linkedin_url text,
  github_url text,

  -- SEO
  meta_title text,
  meta_description text,

  -- Stats
  member_count integer DEFAULT 1,
  post_count integer DEFAULT 0,
  subscriber_count integer DEFAULT 0,

  -- Ownership
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for publications
CREATE INDEX IF NOT EXISTS idx_publications_slug
ON publications(slug);

CREATE INDEX IF NOT EXISTS idx_publications_creator
ON publications(creator_id);

CREATE INDEX IF NOT EXISTS idx_publications_public
ON publications(is_public)
WHERE is_public = true;

-- ============================================================================
-- 2. PUBLICATION MEMBERS TABLE
-- Track publication membership with roles and permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'writer', 'contributor')),

  -- Permissions
  can_publish boolean DEFAULT false,
  can_edit_others boolean DEFAULT false,
  can_delete_posts boolean DEFAULT false,
  can_manage_members boolean DEFAULT false,
  can_manage_settings boolean DEFAULT false,

  -- Stats
  post_count integer DEFAULT 0,
  last_published_at timestamptz,

  joined_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(publication_id, user_id)
);

-- Indexes for publication members
CREATE INDEX IF NOT EXISTS idx_publication_members_publication
ON publication_members(publication_id, role);

CREATE INDEX IF NOT EXISTS idx_publication_members_user
ON publication_members(user_id);

-- ============================================================================
-- 3. PUBLICATION INVITATIONS TABLE
-- Email-based invitation system for adding members
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  invitee_email text NOT NULL,
  invitee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  role text NOT NULL CHECK (role IN ('editor', 'writer', 'contributor')),
  message text,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),

  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_publication_invitations_publication
ON publication_invitations(publication_id, status);

CREATE INDEX IF NOT EXISTS idx_publication_invitations_email
ON publication_invitations(invitee_email, status);

CREATE INDEX IF NOT EXISTS idx_publication_invitations_token
ON publication_invitations(token);

-- ============================================================================
-- 4. PUBLICATION SUBMISSIONS TABLE
-- Submission workflow for posts with approval/rejection
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  submitter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),

  -- Review
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_at timestamptz,

  -- Submission notes
  submission_notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(publication_id, post_id)
);

-- Indexes for submissions
CREATE INDEX IF NOT EXISTS idx_publication_submissions_publication
ON publication_submissions(publication_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_publication_submissions_submitter
ON publication_submissions(submitter_id, status);

CREATE INDEX IF NOT EXISTS idx_publication_submissions_reviewer
ON publication_submissions(reviewer_id, reviewed_at DESC)
WHERE reviewer_id IS NOT NULL;

-- ============================================================================
-- 5. PUBLICATION ANALYTICS TABLE
-- Track publication-level analytics separate from personal
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,

  -- Post metrics
  posts_published integer DEFAULT 0,
  total_posts integer DEFAULT 0,

  -- Engagement metrics
  total_views integer DEFAULT 0,
  total_reads integer DEFAULT 0,
  total_claps integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_bookmarks integer DEFAULT 0,

  -- Growth metrics
  new_subscribers integer DEFAULT 0,
  total_subscribers integer DEFAULT 0,
  new_members integer DEFAULT 0,
  total_members integer DEFAULT 0,

  -- Newsletter metrics
  newsletters_sent integer DEFAULT 0,
  newsletter_open_rate numeric(5, 2) DEFAULT 0,
  newsletter_click_rate numeric(5, 2) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(publication_id, date)
);

-- Indexes for publication analytics
CREATE INDEX IF NOT EXISTS idx_publication_analytics_publication
ON publication_analytics(publication_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_publication_analytics_date
ON publication_analytics(date DESC);

-- ============================================================================
-- 6. PUBLICATION NEWSLETTERS TABLE
-- Newsletter management for publications
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  subject text NOT NULL,
  content text NOT NULL,
  preview_text text,

  -- Scheduling
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,

  -- Stats
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,

  -- Author
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for newsletters
CREATE INDEX IF NOT EXISTS idx_publication_newsletters_publication
ON publication_newsletters(publication_id, status, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_publication_newsletters_author
ON publication_newsletters(author_id);

-- ============================================================================
-- 7. PUBLICATION SUBSCRIBERS TABLE
-- Track newsletter subscribers for publications
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,

  is_active boolean DEFAULT true,

  -- Preferences
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),

  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz,

  UNIQUE(publication_id, email)
);

-- Indexes for subscribers
CREATE INDEX IF NOT EXISTS idx_publication_subscribers_publication
ON publication_subscribers(publication_id, is_active);

CREATE INDEX IF NOT EXISTS idx_publication_subscribers_user
ON publication_subscribers(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_publication_subscribers_email
ON publication_subscribers(email);

-- ============================================================================
-- 8. PUBLICATION STYLE GUIDES TABLE
-- Custom writing guidelines and style rules for publications
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_style_guides (
  publication_id uuid PRIMARY KEY REFERENCES publications(id) ON DELETE CASCADE,

  -- Writing guidelines
  tone_and_voice text,
  formatting_rules text,
  content_guidelines text,

  -- Editorial standards
  word_count_min integer,
  word_count_max integer,
  required_sections jsonb DEFAULT '[]'::jsonb,
  prohibited_topics jsonb DEFAULT '[]'::jsonb,

  -- SEO guidelines
  seo_guidelines text,
  keyword_strategy text,

  -- Resources
  resources jsonb DEFAULT '[]'::jsonb,

  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 9. PUBLICATION REVENUE SHARING TABLE
-- Configure revenue sharing for publication members
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_revenue_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES publication_members(id) ON DELETE CASCADE,

  -- Revenue share configuration
  share_percentage numeric(5, 2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
  share_type text NOT NULL CHECK (share_type IN ('flat', 'performance_based', 'custom')),

  -- Performance metrics (for performance-based sharing)
  min_views integer DEFAULT 0,
  min_reads integer DEFAULT 0,

  -- Custom formula
  custom_formula text,

  is_active boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(publication_id, member_id)
);

-- Indexes for revenue sharing
CREATE INDEX IF NOT EXISTS idx_publication_revenue_sharing_publication
ON publication_revenue_sharing(publication_id, is_active);

CREATE INDEX IF NOT EXISTS idx_publication_revenue_sharing_member
ON publication_revenue_sharing(member_id);

-- ============================================================================
-- 10. PUBLICATION POSTS TABLE
-- Link posts to publications with cross-posting support
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Publishing info
  published_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  published_at timestamptz DEFAULT now(),

  -- Cross-posting
  is_cross_posted boolean DEFAULT false,
  original_publication_id uuid REFERENCES publications(id) ON DELETE SET NULL,

  -- Featured
  is_featured boolean DEFAULT false,
  featured_at timestamptz,

  UNIQUE(publication_id, post_id)
);

-- Indexes for publication posts
CREATE INDEX IF NOT EXISTS idx_publication_posts_publication
ON publication_posts(publication_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_publication_posts_post
ON publication_posts(post_id);

CREATE INDEX IF NOT EXISTS idx_publication_posts_featured
ON publication_posts(publication_id, is_featured, featured_at DESC)
WHERE is_featured = true;

-- ============================================================================
-- 11. PUBLICATION MODERATION TABLE
-- Track moderation actions within publications
-- ============================================================================

CREATE TABLE IF NOT EXISTS publication_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  moderator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  action_type text NOT NULL CHECK (action_type IN (
    'post_approved', 'post_rejected', 'post_removed', 'post_featured',
    'member_added', 'member_removed', 'member_role_changed',
    'submission_reviewed', 'settings_changed'
  )),

  target_type text CHECK (target_type IN ('post', 'member', 'submission', 'publication')),
  target_id uuid,

  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- Indexes for moderation logs
CREATE INDEX IF NOT EXISTS idx_publication_moderation_logs_publication
ON publication_moderation_logs(publication_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_publication_moderation_logs_moderator
ON publication_moderation_logs(moderator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_publication_moderation_logs_action
ON publication_moderation_logs(action_type, created_at DESC);

-- ============================================================================
-- 12. MATERIALIZED VIEW FOR PUBLICATION STATS
-- Pre-computed statistics for publication dashboards
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS publication_stats_summary AS
SELECT
  p.id AS publication_id,
  p.name,
  p.slug,
  COUNT(DISTINCT pm.id) AS total_members,
  COUNT(DISTINCT pp.post_id) AS total_posts,
  COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_active = true) AS total_subscribers,
  COALESCE(SUM(pa.total_views), 0) AS total_views,
  COALESCE(SUM(pa.total_reads), 0) AS total_reads,
  COALESCE(SUM(pa.total_claps), 0) AS total_claps,
  MAX(pp.published_at) AS last_published_at,
  DATE_TRUNC('day', NOW()) AS last_updated
FROM publications p
LEFT JOIN publication_members pm ON p.id = pm.publication_id
LEFT JOIN publication_posts pp ON p.id = pp.publication_id
LEFT JOIN publication_subscribers ps ON p.id = ps.publication_id
LEFT JOIN publication_analytics pa ON p.id = pa.publication_id
WHERE p.is_public = true
GROUP BY p.id, p.name, p.slug;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_publication_stats_publication
ON publication_stats_summary(publication_id);

-- ============================================================================
-- 13. HELPER FUNCTIONS
-- Functions for publication operations
-- ============================================================================

-- Function to accept publication invitation
CREATE OR REPLACE FUNCTION accept_publication_invitation(
  p_token text,
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_invitation publication_invitations;
  v_member_id uuid;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM publication_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Update invitation
  UPDATE publication_invitations
  SET status = 'accepted',
      invitee_id = p_user_id,
      accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Add member
  INSERT INTO publication_members (
    publication_id,
    user_id,
    role,
    can_publish,
    can_edit_others,
    can_delete_posts,
    can_manage_members,
    can_manage_settings
  ) VALUES (
    v_invitation.publication_id,
    p_user_id,
    v_invitation.role,
    v_invitation.role IN ('owner', 'editor'),
    v_invitation.role IN ('owner', 'editor'),
    v_invitation.role IN ('owner', 'editor'),
    v_invitation.role = 'owner',
    v_invitation.role = 'owner'
  ) RETURNING id INTO v_member_id;

  -- Update publication member count
  UPDATE publications
  SET member_count = member_count + 1
  WHERE id = v_invitation.publication_id;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql;

-- Function to submit post to publication
CREATE OR REPLACE FUNCTION submit_post_to_publication(
  p_publication_id uuid,
  p_post_id uuid,
  p_submitter_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_submission_id uuid;
  v_publication publications;
  v_is_member boolean;
BEGIN
  -- Check if publication exists and allows submissions
  SELECT * INTO v_publication
  FROM publications
  WHERE id = p_publication_id
    AND allow_submissions = true;

  IF v_publication IS NULL THEN
    RAISE EXCEPTION 'Publication does not accept submissions';
  END IF;

  -- Check if user is a member
  SELECT EXISTS (
    SELECT 1 FROM publication_members
    WHERE publication_id = p_publication_id
      AND user_id = p_submitter_id
  ) INTO v_is_member;

  -- Create submission
  INSERT INTO publication_submissions (
    publication_id,
    post_id,
    submitter_id,
    submission_notes,
    status
  ) VALUES (
    p_publication_id,
    p_post_id,
    p_submitter_id,
    p_notes,
    CASE WHEN NOT v_publication.require_approval THEN 'approved' ELSE 'pending' END
  ) RETURNING id INTO v_submission_id;

  -- If auto-approved, add to publication posts
  IF NOT v_publication.require_approval THEN
    INSERT INTO publication_posts (
      publication_id,
      post_id,
      published_by
    ) VALUES (
      p_publication_id,
      p_post_id,
      p_submitter_id
    );

    -- Update publication post count
    UPDATE publications
    SET post_count = post_count + 1
    WHERE id = p_publication_id;
  END IF;

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql;

-- Function to approve submission
CREATE OR REPLACE FUNCTION approve_publication_submission(
  p_submission_id uuid,
  p_reviewer_id uuid,
  p_notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_submission publication_submissions;
BEGIN
  -- Get submission
  SELECT * INTO v_submission
  FROM publication_submissions
  WHERE id = p_submission_id
    AND status = 'pending';

  IF v_submission IS NULL THEN
    RAISE EXCEPTION 'Submission not found or already reviewed';
  END IF;

  -- Update submission
  UPDATE publication_submissions
  SET status = 'approved',
      reviewer_id = p_reviewer_id,
      review_notes = p_notes,
      reviewed_at = NOW()
  WHERE id = p_submission_id;

  -- Add to publication posts
  INSERT INTO publication_posts (
    publication_id,
    post_id,
    published_by
  ) VALUES (
    v_submission.publication_id,
    v_submission.post_id,
    p_reviewer_id
  );

  -- Update publication post count
  UPDATE publications
  SET post_count = post_count + 1
  WHERE id = v_submission.publication_id;

  -- Log moderation action
  INSERT INTO publication_moderation_logs (
    publication_id,
    moderator_id,
    action_type,
    target_type,
    target_id,
    metadata
  ) VALUES (
    v_submission.publication_id,
    p_reviewer_id,
    'post_approved',
    'submission',
    p_submission_id,
    jsonb_build_object('post_id', v_submission.post_id)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh publication stats
CREATE OR REPLACE FUNCTION refresh_publication_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY publication_stats_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. TRIGGERS
-- Automatic updates for publication stats
-- ============================================================================

-- Trigger to update publication updated_at
CREATE OR REPLACE FUNCTION update_publication_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_publication_timestamp ON publications;
CREATE TRIGGER trigger_update_publication_timestamp
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION update_publication_timestamp();

DROP TRIGGER IF EXISTS trigger_update_publication_member_timestamp ON publication_members;
CREATE TRIGGER trigger_update_publication_member_timestamp
  BEFORE UPDATE ON publication_members
  FOR EACH ROW
  EXECUTE FUNCTION update_publication_timestamp();

-- ============================================================================
-- 15. ROW LEVEL SECURITY
-- Secure access to publication data
-- ============================================================================

-- Publications - public for reading, owners can manage
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY publications_select_public
ON publications FOR SELECT
USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY publications_insert_authenticated
ON publications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

CREATE POLICY publications_update_owner
ON publications FOR UPDATE
USING (creator_id = auth.uid());

CREATE POLICY publications_delete_owner
ON publications FOR DELETE
USING (creator_id = auth.uid());

-- Publication members - members can view, owners can manage
ALTER TABLE publication_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_members_select_member
ON publication_members FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM publication_members pm
    WHERE pm.publication_id = publication_members.publication_id
      AND pm.user_id = auth.uid()
  )
);

CREATE POLICY publication_members_insert_manager
ON publication_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM publication_members
    WHERE publication_id = publication_members.publication_id
      AND user_id = auth.uid()
      AND can_manage_members = true
  )
);

-- Publication invitations
ALTER TABLE publication_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_invitations_select_own
ON publication_invitations FOR SELECT
USING (
  invitee_email = (SELECT email FROM profiles WHERE id = auth.uid()) OR
  inviter_id = auth.uid()
);

-- Publication submissions - submitters and members can view
ALTER TABLE publication_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_submissions_select_member
ON publication_submissions FOR SELECT
USING (
  submitter_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM publication_members
    WHERE publication_id = publication_submissions.publication_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY publication_submissions_insert_member
ON publication_submissions FOR INSERT
WITH CHECK (submitter_id = auth.uid());

-- Publication posts - public for reading
ALTER TABLE publication_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_posts_select_all
ON publication_posts FOR SELECT
USING (true);

-- Publication subscribers
ALTER TABLE publication_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY publication_subscribers_select_own
ON publication_subscribers FOR SELECT
USING (
  user_id = auth.uid() OR
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY publication_subscribers_insert_all
ON publication_subscribers FOR INSERT
WITH CHECK (true);

COMMIT;

-- ============================================================================
-- UPDATE STATISTICS
-- Refresh query planner statistics
-- ============================================================================
ANALYZE publications;
ANALYZE publication_members;
ANALYZE publication_invitations;
ANALYZE publication_submissions;
ANALYZE publication_analytics;
ANALYZE publication_posts;

-- ============================================================================
-- VERIFICATION QUERIES
-- Test publication features
-- ============================================================================

-- Test 1: Create a publication
-- INSERT INTO publications (slug, name, tagline, creator_id)
-- VALUES ('my-pub', 'My Publication', 'Great writing', 'user-uuid');

-- Test 2: Invite a member
-- INSERT INTO publication_invitations (publication_id, inviter_id, invitee_email, role, token)
-- VALUES ('pub-uuid', 'inviter-uuid', 'member@example.com', 'writer', gen_random_uuid()::text);

-- Test 3: Submit a post
-- SELECT submit_post_to_publication('pub-uuid', 'post-uuid', 'author-uuid', 'Please review');

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- Expected performance:
-- - Publication queries: Indexed by slug and creator
-- - Member lookups: Fast via publication_id + user_id index
-- - Submission workflow: Efficient status filtering
-- - Analytics: Materialized view for dashboard queries
-- - Cross-posting: Tracked via publication_posts with original reference
--
-- Maintenance:
-- - Refresh publication stats view every 10 minutes
-- - Archive old invitations after 30 days
-- - Clean up expired tokens periodically
--
-- ============================================================================
