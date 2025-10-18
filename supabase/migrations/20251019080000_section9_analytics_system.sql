-- ============================================================================
-- Section 9: Analytics and Insights - Database Schema
-- Date: 2025-10-19
-- Description: Comprehensive analytics system for tracking user behavior,
--              post performance, referrals, and custom events
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. POST ANALYTICS TABLE
-- Track detailed metrics for each post
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  reads integer DEFAULT 0, -- Views where user scrolled >50%
  avg_read_time_seconds integer DEFAULT 0,
  bounce_rate numeric(5, 2) DEFAULT 0,
  engagement_rate numeric(5, 2) DEFAULT 0,
  shares integer DEFAULT 0,
  bookmarks integer DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, date)
);

-- Indexes for post analytics
CREATE INDEX IF NOT EXISTS idx_post_analytics_post
ON post_analytics(post_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_post_analytics_date
ON post_analytics(date DESC);

-- ============================================================================
-- 2. POST VIEW EVENTS
-- Individual view event tracking with detailed metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  referrer text,
  user_agent text,
  device_type text CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  country text,
  city text,
  read_time_seconds integer DEFAULT 0,
  scroll_percentage integer DEFAULT 0 CHECK (scroll_percentage >= 0 AND scroll_percentage <= 100),
  is_unique_view boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for post view events
CREATE INDEX IF NOT EXISTS idx_post_view_events_post
ON post_view_events(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_view_events_user
ON post_view_events(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_view_events_session
ON post_view_events(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_view_events_referrer
ON post_view_events(referrer, created_at DESC)
WHERE referrer IS NOT NULL;

-- ============================================================================
-- 3. REFERRAL TRACKING
-- Track traffic sources and referrals
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  referrer_url text,
  referrer_domain text,
  referrer_type text CHECK (referrer_type IN ('direct', 'search', 'social', 'external', 'internal')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  visits integer DEFAULT 1,
  conversions integer DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for referral tracking
CREATE INDEX IF NOT EXISTS idx_referral_tracking_post
ON referral_tracking(post_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_domain
ON referral_tracking(referrer_domain, date DESC);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_utm
ON referral_tracking(utm_source, utm_medium, utm_campaign, date DESC);

-- ============================================================================
-- 4. CUSTOM EVENT TRACKING
-- Track custom events for user interactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_category text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  properties jsonb DEFAULT '{}'::jsonb,
  value numeric,
  created_at timestamptz DEFAULT now()
);

-- Indexes for analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_name
ON analytics_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
ON analytics_events(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_category
ON analytics_events(event_category, created_at DESC)
WHERE event_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
ON analytics_events(created_at DESC);

-- ============================================================================
-- 5. USER COHORTS
-- Track user cohorts for retention analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_date date NOT NULL, -- Signup date (week/month)
  cohort_type text NOT NULL CHECK (cohort_type IN ('weekly', 'monthly')),
  retention_day integer,
  is_retained boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, cohort_date, cohort_type, retention_day)
);

-- Indexes for cohort analysis
CREATE INDEX IF NOT EXISTS idx_user_cohorts_date
ON user_cohorts(cohort_date, cohort_type, retention_day);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_user
ON user_cohorts(user_id, cohort_date DESC);

-- ============================================================================
-- 6. A/B TEST EXPERIMENTS
-- Track A/B testing experiments and variants
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variants jsonb NOT NULL, -- Array of variant configurations
  traffic_allocation numeric(3, 2) DEFAULT 1.0 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 1),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  variant text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

CREATE TABLE IF NOT EXISTS ab_experiment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES ab_experiment_assignments(id) ON DELETE CASCADE,
  variant text NOT NULL,
  event_name text NOT NULL,
  event_value numeric,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for A/B testing
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment
ON ab_experiment_assignments(experiment_id, variant);

CREATE INDEX IF NOT EXISTS idx_ab_events_experiment
ON ab_experiment_events(experiment_id, variant, event_name);

-- ============================================================================
-- 7. CONVERSION TRACKING
-- Track conversion events (CTAs, signups, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_type text NOT NULL, -- 'cta_click', 'signup', 'subscribe', etc.
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,
  source_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  conversion_value numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for conversion tracking
CREATE INDEX IF NOT EXISTS idx_conversion_events_type
ON conversion_events(conversion_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user
ON conversion_events(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_post
ON conversion_events(source_post_id, created_at DESC)
WHERE source_post_id IS NOT NULL;

-- ============================================================================
-- 8. MATERIALIZED VIEW FOR AUTHOR ANALYTICS
-- Pre-computed analytics for author dashboard
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS author_analytics_summary AS
SELECT
  p.author_id,
  COUNT(DISTINCT p.id) AS total_posts,
  COALESCE(SUM(pa.views), 0) AS total_views,
  COALESCE(SUM(pa.unique_views), 0) AS total_unique_views,
  COALESCE(SUM(pa.reads), 0) AS total_reads,
  COALESCE(AVG(pa.avg_read_time_seconds), 0) AS avg_read_time,
  COALESCE(AVG(pa.engagement_rate), 0) AS avg_engagement_rate,
  COALESCE(SUM(p.vote_count), 0) AS total_votes,
  COALESCE(SUM(p.comment_count), 0) AS total_comments,
  COUNT(DISTINCT pve.user_id) AS unique_readers,
  DATE_TRUNC('day', NOW()) AS last_updated
FROM posts p
LEFT JOIN post_analytics pa ON p.id = pa.post_id
LEFT JOIN post_view_events pve ON p.id = pve.post_id
WHERE p.is_published = true AND p.is_draft = false
GROUP BY p.author_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_author_analytics_author
ON author_analytics_summary(author_id);

-- ============================================================================
-- 9. FUNCTIONS FOR ANALYTICS AGGREGATION
-- Helper functions for calculating analytics
-- ============================================================================

-- Function to refresh author analytics
CREATE OR REPLACE FUNCTION refresh_author_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY author_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_views integer,
  p_votes integer,
  p_comments integer,
  p_shares integer
) RETURNS numeric AS $$
BEGIN
  IF p_views = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(((p_votes + p_comments + p_shares) * 100.0 / p_views), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to track post view
CREATE OR REPLACE FUNCTION track_post_view(
  p_post_id uuid,
  p_user_id uuid,
  p_session_id text,
  p_referrer text,
  p_user_agent text,
  p_device_type text
) RETURNS uuid AS $$
DECLARE
  v_view_id uuid;
  v_is_unique boolean;
  v_date date := CURRENT_DATE;
BEGIN
  -- Check if this is a unique view (first view by this session for this post today)
  SELECT NOT EXISTS (
    SELECT 1 FROM post_view_events
    WHERE post_id = p_post_id
      AND session_id = p_session_id
      AND DATE(created_at) = v_date
  ) INTO v_is_unique;

  -- Insert view event
  INSERT INTO post_view_events (
    post_id, user_id, session_id, referrer, user_agent, device_type, is_unique_view
  ) VALUES (
    p_post_id, p_user_id, p_session_id, p_referrer, p_user_agent, p_device_type, v_is_unique
  ) RETURNING id INTO v_view_id;

  -- Update post analytics
  INSERT INTO post_analytics (post_id, date, views, unique_views)
  VALUES (p_post_id, v_date, 1, CASE WHEN v_is_unique THEN 1 ELSE 0 END)
  ON CONFLICT (post_id, date) DO UPDATE SET
    views = post_analytics.views + 1,
    unique_views = post_analytics.unique_views + CASE WHEN v_is_unique THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track custom event
CREATE OR REPLACE FUNCTION track_event(
  p_event_name text,
  p_event_category text,
  p_user_id uuid,
  p_session_id text,
  p_properties jsonb,
  p_value numeric DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO analytics_events (
    event_name, event_category, user_id, session_id, properties, value
  ) VALUES (
    p_event_name, p_event_category, p_user_id, p_session_id, p_properties, p_value
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. ROW LEVEL SECURITY
-- Secure access to analytics data
-- ============================================================================

-- Post analytics - authors can view their own
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_analytics_select_author
ON post_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_analytics.post_id
      AND posts.author_id = auth.uid()
  )
);

-- Post view events - system only
ALTER TABLE post_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_view_events_insert_all
ON post_view_events FOR INSERT
WITH CHECK (true);

-- Analytics events - users can view their own
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_events_select_own
ON analytics_events FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY analytics_events_insert_all
ON analytics_events FOR INSERT
WITH CHECK (true);

-- Conversion events - users can view their own
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversion_events_select_own
ON conversion_events FOR SELECT
USING (user_id = auth.uid());

COMMIT;

-- ============================================================================
-- UPDATE STATISTICS
-- Refresh query planner statistics
-- ============================================================================
ANALYZE post_analytics;
ANALYZE post_view_events;
ANALYZE referral_tracking;
ANALYZE analytics_events;
ANALYZE conversion_events;

-- ============================================================================
-- VERIFICATION QUERIES
-- Test analytics features
-- ============================================================================

-- Test 1: Track a post view
-- SELECT track_post_view(
--   'post-uuid',
--   'user-uuid',
--   'session-123',
--   'https://google.com',
--   'Mozilla/5.0...',
--   'desktop'
-- );

-- Test 2: Get author analytics
-- SELECT * FROM author_analytics_summary WHERE author_id = 'author-uuid';

-- Test 3: Track custom event
-- SELECT track_event(
--   'button_click',
--   'engagement',
--   'user-uuid',
--   'session-123',
--   '{"button_id": "cta-primary"}'::jsonb,
--   1
-- );

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
--
-- Expected performance:
-- - Post view tracking: <5ms (single insert + upsert)
-- - Author analytics: <50ms (materialized view read)
-- - Event tracking: <3ms (single insert)
-- - Referral queries: Indexed by domain and UTM parameters
-- - Cohort analysis: Efficient date-based queries
--
-- Maintenance:
-- - Refresh author analytics view every 5 minutes
-- - Archive old view events after 90 days
-- - Aggregate historical data monthly
--
-- ============================================================================
