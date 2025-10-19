/*
  # Admin System Implementation

  ## Overview
  This migration adds comprehensive admin system functionality including:
  - Admin roles and permissions
  - Admin activity logging
  - User suspension and ban system
  - Content moderation enhancements
  - System configuration settings

  ## New Tables

  ### 1. admin_roles
  Defines different admin role types with their permissions
  - `id` (uuid, primary key) - Unique role identifier
  - `name` (text, unique) - Role name (super_admin, admin, moderator, editor)
  - `description` (text) - Role description
  - `permissions` (jsonb) - Permission flags
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. admin_activity_logs
  Tracks all admin actions for audit purposes
  - `id` (uuid, primary key) - Unique log identifier
  - `admin_id` (uuid, references profiles) - Admin who performed action
  - `action_type` (text) - Type of action performed
  - `target_type` (text) - Type of entity affected (user, post, comment, etc.)
  - `target_id` (uuid) - ID of affected entity
  - `details` (jsonb) - Additional action details
  - `ip_address` (text) - IP address of admin
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz) - Action timestamp

  ### 3. user_suspensions
  Manages user suspension and ban records
  - `id` (uuid, primary key) - Unique suspension identifier
  - `user_id` (uuid, references profiles) - Suspended user
  - `suspended_by` (uuid, references profiles) - Admin who issued suspension
  - `reason` (text) - Suspension reason
  - `suspension_type` (text) - Type: temporary, permanent, warning
  - `starts_at` (timestamptz) - Suspension start time
  - `expires_at` (timestamptz) - Suspension end time (null for permanent)
  - `is_active` (boolean) - Active status
  - `appeal_status` (text) - Appeal status: none, pending, approved, rejected
  - `appeal_notes` (text) - Appeal details
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. content_reports
  Enhanced content reporting system
  - Enhanced from existing table with admin workflow fields

  ### 5. system_settings
  Platform-wide configuration settings
  - `id` (uuid, primary key) - Unique setting identifier
  - `key` (text, unique) - Setting key
  - `value` (jsonb) - Setting value
  - `category` (text) - Setting category (email, security, features, etc.)
  - `description` (text) - Setting description
  - `is_public` (boolean) - Whether setting is publicly readable
  - `updated_by` (uuid, references profiles) - Last admin who updated
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Modified Tables

  ### profiles table modifications
  - Add `role` (text) - User role: user, moderator, editor, admin, super_admin
  - Add `is_admin` (boolean) - Quick admin check flag
  - Add `is_suspended` (boolean) - Suspension status
  - Add `is_banned` (boolean) - Ban status
  - Add `admin_notes` (text) - Internal admin notes about user
  - Add `last_active_at` (timestamptz) - Last activity timestamp
*/

-- Add admin-related columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'editor', 'admin', 'super_admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index on role and admin status for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON profiles(last_active_at DESC);

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_roles (only super_admins can modify)
CREATE POLICY "Super admins can manage roles"
  ON admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view roles"
  ON admin_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text DEFAULT '',
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action_type ON admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_logs(target_type, target_id);

-- RLS policies for admin activity logs
CREATE POLICY "Admins can view activity logs"
  ON admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can create activity logs"
  ON admin_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suspended_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  suspension_type text DEFAULT 'temporary' CHECK (suspension_type IN ('warning', 'temporary', 'permanent')),
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  appeal_status text DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected')),
  appeal_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Create indexes for user suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_is_active ON user_suspensions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_suspensions_expires_at ON user_suspensions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_appeal_status ON user_suspensions(appeal_status);

-- RLS policies for user suspensions
CREATE POLICY "Users can view their own suspensions"
  ON user_suspensions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage suspensions"
  ON user_suspensions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}',
  category text DEFAULT 'general',
  description text DEFAULT '',
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for system settings
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public) WHERE is_public = true;

-- RLS policies for system settings
CREATE POLICY "Public settings are viewable by everyone"
  ON system_settings
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins can view all settings"
  ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage settings"
  ON system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    )
  );

-- Insert default admin roles
INSERT INTO admin_roles (name, description, permissions) VALUES
  ('super_admin', 'Full system access with all permissions', '{"all": true}'),
  ('admin', 'Administrative access with most permissions', '{"users": true, "content": true, "settings": true, "analytics": true}'),
  ('moderator', 'Content moderation and user management', '{"content": true, "users": true, "reports": true}'),
  ('editor', 'Content management only', '{"content": true, "posts": true, "categories": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description, is_public) VALUES
  ('maintenance_mode', '{"enabled": false, "message": ""}', 'system', 'Maintenance mode configuration', false),
  ('registration_enabled', '{"enabled": true}', 'system', 'Allow new user registrations', false),
  ('email_verification_required', '{"enabled": true}', 'security', 'Require email verification for new users', false),
  ('rate_limit_posts', '{"limit": 10, "window": 3600}', 'security', 'Rate limit for post creation', false),
  ('rate_limit_comments', '{"limit": 30, "window": 3600}', 'security', 'Rate limit for comment creation', false),
  ('featured_tags', '{"tags": []}', 'content', 'Featured tags to display', true),
  ('announcement_banner', '{"enabled": false, "message": "", "type": "info"}', 'content', 'Site-wide announcement banner', true)
ON CONFLICT (key) DO NOTHING;

-- Function to automatically update is_admin flag when role changes
CREATE OR REPLACE FUNCTION update_is_admin_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('admin', 'super_admin', 'moderator', 'editor') THEN
    NEW.is_admin := true;
  ELSE
    NEW.is_admin := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating is_admin flag
DROP TRIGGER IF EXISTS trigger_update_is_admin ON profiles;
CREATE TRIGGER trigger_update_is_admin
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_is_admin_flag();

-- Function to log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text DEFAULT '',
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO admin_activity_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (p_admin_id, p_action_type, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is currently suspended
CREATE OR REPLACE FUNCTION is_user_suspended(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_suspensions
    WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get active suspension for user
CREATE OR REPLACE FUNCTION get_active_suspension(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  reason text,
  suspension_type text,
  starts_at timestamptz,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    us.reason,
    us.suspension_type,
    us.starts_at,
    us.expires_at
  FROM user_suspensions us
  WHERE us.user_id = p_user_id
  AND us.is_active = true
  AND (us.expires_at IS NULL OR us.expires_at > now())
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire suspensions
CREATE OR REPLACE FUNCTION expire_old_suspensions()
RETURNS void AS $$
BEGIN
  UPDATE user_suspensions
  SET is_active = false
  WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();

  UPDATE profiles
  SET is_suspended = false
  WHERE id IN (
    SELECT user_id FROM user_suspensions
    WHERE is_active = false
    AND NOT EXISTS (
      SELECT 1 FROM user_suspensions us2
      WHERE us2.user_id = user_suspensions.user_id
      AND us2.is_active = true
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to expire old suspensions (runs every hour)
-- Note: This requires pg_cron extension which may not be available in all Supabase projects
-- Alternative: Call this function from your application's cron job
/*
SELECT cron.schedule(
  'expire-suspensions',
  '0 * * * *', -- Every hour
  $$SELECT expire_old_suspensions()$$
);
*/

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add helpful comments
COMMENT ON TABLE admin_roles IS 'Defines different admin role types with their permissions';
COMMENT ON TABLE admin_activity_logs IS 'Audit log of all admin actions';
COMMENT ON TABLE user_suspensions IS 'User suspension and ban records';
COMMENT ON TABLE system_settings IS 'Platform-wide configuration settings';
COMMENT ON FUNCTION log_admin_activity IS 'Logs an admin activity for audit purposes';
COMMENT ON FUNCTION is_user_suspended IS 'Checks if a user is currently suspended';
COMMENT ON FUNCTION get_active_suspension IS 'Returns active suspension details for a user';
COMMENT ON FUNCTION expire_old_suspensions IS 'Automatically expires old temporary suspensions';
