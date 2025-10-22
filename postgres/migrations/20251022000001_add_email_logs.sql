/**
 * Email Logs Migration
 *
 * Creates table for tracking email delivery status
 * Supports:
 * - Email delivery tracking
 * - Error logging
 * - Analytics and reporting
 * - Audit trail
 */

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email Details
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'bounced')),

  -- Email Provider Details
  email_id TEXT, -- Resend email ID
  provider TEXT DEFAULT 'resend',

  -- Error Details
  error_message TEXT,
  error_code TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);

-- Create composite index for analytics queries
CREATE INDEX idx_email_logs_user_template_status ON email_logs(user_id, template, status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_logs_updated_at_trigger
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY email_logs_select_policy ON email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert email logs (via service)
CREATE POLICY email_logs_insert_policy ON email_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role can update any email log
CREATE POLICY email_logs_update_policy ON email_logs
  FOR UPDATE
  USING (true);

-- Add comment to table
COMMENT ON TABLE email_logs IS 'Tracks email delivery status and errors';

-- Add comments to columns
COMMENT ON COLUMN email_logs.id IS 'Unique identifier for email log';
COMMENT ON COLUMN email_logs.user_id IS 'User who received the email';
COMMENT ON COLUMN email_logs.to_email IS 'Recipient email address';
COMMENT ON COLUMN email_logs.template IS 'Email template used';
COMMENT ON COLUMN email_logs.subject IS 'Email subject line';
COMMENT ON COLUMN email_logs.status IS 'Delivery status (queued, processing, sent, failed, bounced)';
COMMENT ON COLUMN email_logs.email_id IS 'Provider email ID (e.g., Resend email ID)';
COMMENT ON COLUMN email_logs.provider IS 'Email service provider (default: resend)';
COMMENT ON COLUMN email_logs.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN email_logs.error_code IS 'Error code if delivery failed';
COMMENT ON COLUMN email_logs.metadata IS 'Additional metadata (JSON)';
COMMENT ON COLUMN email_logs.queued_at IS 'When the email was queued';
COMMENT ON COLUMN email_logs.sent_at IS 'When the email was successfully sent';
COMMENT ON COLUMN email_logs.created_at IS 'When the log entry was created';
COMMENT ON COLUMN email_logs.updated_at IS 'When the log entry was last updated';

-- Create helper function to log email
CREATE OR REPLACE FUNCTION log_email(
  p_user_id UUID,
  p_to_email TEXT,
  p_template TEXT,
  p_subject TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO email_logs (
    user_id,
    to_email,
    template,
    subject,
    status,
    metadata
  ) VALUES (
    p_user_id,
    p_to_email,
    p_template,
    p_subject,
    'queued',
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to update email status
CREATE OR REPLACE FUNCTION update_email_status(
  p_log_id UUID,
  p_status TEXT,
  p_email_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE email_logs
  SET
    status = p_status,
    email_id = COALESCE(p_email_id, email_id),
    error_message = p_error_message,
    error_code = p_error_code,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for email statistics
CREATE OR REPLACE VIEW email_stats AS
SELECT
  user_id,
  template,
  status,
  COUNT(*) as count,
  MIN(created_at) as first_sent,
  MAX(created_at) as last_sent
FROM email_logs
GROUP BY user_id, template, status;

COMMENT ON VIEW email_stats IS 'Email delivery statistics by user, template, and status';

-- Grant permissions
GRANT SELECT ON email_stats TO authenticated;
GRANT EXECUTE ON FUNCTION log_email TO authenticated;
GRANT EXECUTE ON FUNCTION update_email_status TO authenticated;
