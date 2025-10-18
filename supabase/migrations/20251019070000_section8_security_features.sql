-- ============================================================================
-- Section 8: Security and Data Protection - Database Schema
-- Date: 2025-10-19
-- Description: Security features including audit logs, moderation queue,
--              and enhanced security tracking tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AUDIT LOGS TABLE
-- Comprehensive audit trail for all sensitive operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_id uuid,
  target_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  created_at timestamptz DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
ON audit_logs(actor_id, created_at DESC)
WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
ON audit_logs(target_id, target_type, created_at DESC)
WHERE target_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_severity
ON audit_logs(severity, created_at DESC)
WHERE severity = 'critical';

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON audit_logs(created_at DESC);

-- ============================================================================
-- 2. CONTENT MODERATION QUEUE
-- Track reported content and moderation decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'user')),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'resolved')),
  moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for moderation queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status
ON moderation_queue(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_content
ON moderation_queue(content_id, content_type);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_reporter
ON moderation_queue(reporter_id, created_at DESC)
WHERE reporter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_queue_moderator
ON moderation_queue(moderator_id, reviewed_at DESC)
WHERE moderator_id IS NOT NULL;

-- ============================================================================
-- 3. SPAM DETECTION TRACKING
-- Track spam detection results for analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS spam_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment')),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  spam_score integer NOT NULL CHECK (spam_score >= 0 AND spam_score <= 100),
  confidence numeric(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  is_spam boolean NOT NULL,
  reasons jsonb DEFAULT '[]'::jsonb,
  action_taken text CHECK (action_taken IN ('blocked', 'flagged', 'allowed')),
  created_at timestamptz DEFAULT now()
);

-- Indexes for spam detection
CREATE INDEX IF NOT EXISTS idx_spam_detections_author
ON spam_detections(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spam_detections_spam
ON spam_detections(is_spam, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spam_detections_content
ON spam_detections(content_id, content_type);

-- ============================================================================
-- 4. RATE LIMIT VIOLATIONS TRACKING
-- Track rate limit violations for security monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  limit_type text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Indexes for rate limit violations
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user
ON rate_limit_violations(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip
ON rate_limit_violations(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint
ON rate_limit_violations(endpoint, created_at DESC);

-- ============================================================================
-- 5. SESSION SECURITY TRACKING
-- Enhanced session tracking for security
-- ============================================================================

-- Add additional security columns to existing session table if needed
DO $$
BEGIN
  -- Add last_activity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session' AND column_name = 'last_activity'
  ) THEN
    ALTER TABLE session ADD COLUMN last_activity timestamptz DEFAULT now();
  END IF;

  -- Add security_flags column for tracking suspicious activity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session' AND column_name = 'security_flags'
  ) THEN
    ALTER TABLE session ADD COLUMN security_flags jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Index for session security monitoring
CREATE INDEX IF NOT EXISTS idx_session_last_activity
ON session(last_activity DESC);

-- ============================================================================
-- 6. USER TRUST SCORES
-- Track user trust scores for spam prevention
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_trust_scores (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  trust_score integer NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  account_age_days integer DEFAULT 0,
  post_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  report_count integer DEFAULT 0,
  spam_detection_count integer DEFAULT 0,
  last_calculated timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for trust score queries
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_score
ON user_trust_scores(trust_score DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- Secure access to security-related tables
-- ============================================================================

-- Enable RLS on audit logs (read-only for users, admins can view all)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_own
ON audit_logs FOR SELECT
USING (actor_id = auth.uid());

CREATE POLICY audit_logs_insert_system
ON audit_logs FOR INSERT
WITH CHECK (true); -- System can insert audit logs

-- Enable RLS on moderation queue
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_queue_select_own
ON moderation_queue FOR SELECT
USING (
  reporter_id = auth.uid() OR
  moderator_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

CREATE POLICY moderation_queue_insert_authenticated
ON moderation_queue FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

CREATE POLICY moderation_queue_update_moderators
ON moderation_queue FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  )
);

-- Enable RLS on spam detections (system only)
ALTER TABLE spam_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY spam_detections_select_admin
ON spam_detections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Enable RLS on rate limit violations (system only)
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_violations_select_admin
ON rate_limit_violations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Enable RLS on trust scores (users can view their own)
ALTER TABLE user_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_trust_scores_select_own
ON user_trust_scores FOR SELECT
USING (user_id = auth.uid());

-- ============================================================================
-- 8. AUTOMATIC TRUST SCORE CALCULATION
-- Trigger to update trust scores when user activity changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_account_age integer;
  v_post_count integer;
  v_comment_count integer;
  v_report_count integer;
  v_spam_count integer;
  v_reputation integer;
  v_trust_score integer;
BEGIN
  -- Determine user ID based on operation
  v_user_id := COALESCE(NEW.user_id, NEW.author_id, NEW.id);

  -- Calculate account age
  SELECT EXTRACT(DAY FROM NOW() - created_at)::integer
  INTO v_account_age
  FROM profiles
  WHERE id = v_user_id;

  -- Get post count
  SELECT COUNT(*)::integer
  INTO v_post_count
  FROM posts
  WHERE author_id = v_user_id AND is_published = true;

  -- Get comment count
  SELECT COUNT(*)::integer
  INTO v_comment_count
  FROM comments
  WHERE author_id = v_user_id AND is_deleted = false;

  -- Get report count
  SELECT COUNT(*)::integer
  INTO v_report_count
  FROM moderation_queue
  WHERE content_id = v_user_id AND content_type = 'user';

  -- Get spam detection count
  SELECT COUNT(*)::integer
  INTO v_spam_count
  FROM spam_detections
  WHERE author_id = v_user_id AND is_spam = true;

  -- Get reputation points
  SELECT COALESCE(reputation_points, 0)::integer
  INTO v_reputation
  FROM user_reputation
  WHERE user_id = v_user_id;

  -- Calculate trust score (0-100)
  v_trust_score := LEAST(100, GREATEST(0,
    LEAST(30, v_account_age) + -- Account age (max 30)
    LEAST(20, v_post_count * 2) + -- Posts (max 20)
    LEAST(20, v_comment_count) + -- Comments (max 20)
    LEAST(30, v_reputation / 10) - -- Reputation (max 30)
    (v_report_count * 10) - -- Reports (-10 each)
    (v_spam_count * 15) -- Spam detections (-15 each)
  ));

  -- Upsert trust score
  INSERT INTO user_trust_scores (
    user_id,
    trust_score,
    account_age_days,
    post_count,
    comment_count,
    report_count,
    spam_detection_count,
    last_calculated,
    updated_at
  ) VALUES (
    v_user_id,
    v_trust_score,
    v_account_age,
    v_post_count,
    v_comment_count,
    v_report_count,
    v_spam_count,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trust_score = v_trust_score,
    account_age_days = v_account_age,
    post_count = v_post_count,
    comment_count = v_comment_count,
    report_count = v_report_count,
    spam_detection_count = v_spam_count,
    last_calculated = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for trust score updates
DROP TRIGGER IF EXISTS trigger_update_trust_score_on_post ON posts;
CREATE TRIGGER trigger_update_trust_score_on_post
  AFTER INSERT OR UPDATE OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_trust_score();

DROP TRIGGER IF EXISTS trigger_update_trust_score_on_comment ON comments;
CREATE TRIGGER trigger_update_trust_score_on_comment
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_trust_score();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- Test security features
-- ============================================================================

-- Test 1: Insert audit log
-- INSERT INTO audit_logs (action, actor_id, severity, metadata)
-- VALUES ('user.login', 'some-uuid', 'info', '{"method": "password"}'::jsonb);

-- Test 2: Create moderation report
-- INSERT INTO moderation_queue (content_id, content_type, reporter_id, reason)
-- VALUES ('some-uuid', 'post', 'reporter-uuid', 'Spam content');

-- Test 3: Check trust scores
-- SELECT * FROM user_trust_scores ORDER BY trust_score DESC LIMIT 10;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- Expected performance improvements:
-- - Audit log queries: Indexed by action, actor, severity, and timestamp
-- - Moderation queue: Fast filtering by status and content type
-- - Spam detection: Historical analysis for pattern detection
-- - Trust scores: Cached calculations updated via triggers
--
-- Security benefits:
-- - Complete audit trail of all sensitive operations
-- - Automated spam detection and tracking
-- - Rate limit violation monitoring
-- - Enhanced session security
-- - User trust scoring for risk assessment
--
-- ============================================================================
