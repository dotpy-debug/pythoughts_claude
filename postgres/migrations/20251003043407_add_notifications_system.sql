/*
  # Notifications System

  ## New Tables
  
  ### 1. notifications
  Store all notification events for users
  - `id` (uuid, primary key) - Unique notification identifier
  - `recipient_id` (uuid, references profiles) - User receiving the notification
  - `sender_id` (uuid, references profiles) - User who triggered the notification (nullable)
  - `type` (text) - Notification type (post_reply, comment_reply, vote, mention, task_assigned)
  - `title` (text) - Notification title
  - `message` (text) - Notification message content
  - `target_id` (uuid) - ID of the target entity (post, comment, task)
  - `target_type` (text) - Type of target (post, comment, task)
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Notification timestamp
  
  ### 2. notification_preferences
  User preferences for notification settings
  - `id` (uuid, primary key) - Unique preference identifier
  - `user_id` (uuid, references profiles) - User who owns preferences
  - `post_replies` (boolean) - Enable notifications for post replies
  - `comment_replies` (boolean) - Enable notifications for comment replies
  - `votes` (boolean) - Enable notifications for votes
  - `mentions` (boolean) - Enable notifications for mentions
  - `task_assignments` (boolean) - Enable notifications for task assignments
  - `browser_notifications` (boolean) - Enable browser notifications
  - `sound_enabled` (boolean) - Enable notification sounds
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - Enable RLS on all tables
  - Users can only view their own notifications
  - Users can only update their own notification preferences
  - Automatic notification creation via triggers
  
  ## Indexes
  - Index on recipient_id and is_read for fast queries
  - Index on created_at for sorting
  - Index on target_id and target_type for lookups
  
  ## Functions
  - Function to create notification on comment creation
  - Function to create notification on task assignment
  - Function to mark notifications as read
  - Function to get unread notification count
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('post_reply', 'comment_reply', 'vote', 'mention', 'task_assigned')),
  title text NOT NULL,
  message text NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'task')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_replies boolean DEFAULT true,
  comment_replies boolean DEFAULT true,
  votes boolean DEFAULT true,
  mentions boolean DEFAULT true,
  task_assignments boolean DEFAULT true,
  browser_notifications boolean DEFAULT true,
  sound_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id uuid;
  parent_author_id uuid;
  notification_enabled boolean;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
    
    IF post_author_id != NEW.author_id THEN
      SELECT post_replies INTO notification_enabled 
      FROM notification_preferences 
      WHERE user_id = post_author_id;
      
      IF notification_enabled IS NULL OR notification_enabled = true THEN
        INSERT INTO notifications (
          recipient_id, 
          sender_id, 
          type, 
          title, 
          message, 
          target_id, 
          target_type
        ) VALUES (
          post_author_id,
          NEW.author_id,
          'post_reply',
          'New reply on your post',
          LEFT(NEW.content, 100),
          NEW.post_id,
          'post'
        );
      END IF;
    END IF;
  ELSE
    SELECT author_id INTO parent_author_id FROM comments WHERE id = NEW.parent_comment_id;
    
    IF parent_author_id != NEW.author_id THEN
      SELECT comment_replies INTO notification_enabled 
      FROM notification_preferences 
      WHERE user_id = parent_author_id;
      
      IF notification_enabled IS NULL OR notification_enabled = true THEN
        INSERT INTO notifications (
          recipient_id, 
          sender_id, 
          type, 
          title, 
          message, 
          target_id, 
          target_type
        ) VALUES (
          parent_author_id,
          NEW.author_id,
          'comment_reply',
          'New reply to your comment',
          LEFT(NEW.content, 100),
          NEW.parent_comment_id,
          'comment'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_task_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_enabled boolean;
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.creator_id THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
      SELECT task_assignments INTO notification_enabled 
      FROM notification_preferences 
      WHERE user_id = NEW.assignee_id;
      
      IF notification_enabled IS NULL OR notification_enabled = true THEN
        INSERT INTO notifications (
          recipient_id, 
          sender_id, 
          type, 
          title, 
          message, 
          target_id, 
          target_type
        ) VALUES (
          NEW.assignee_id,
          NEW.creator_id,
          'task_assigned',
          'New task assigned to you',
          NEW.title,
          NEW.id,
          'task'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
CREATE TRIGGER trigger_create_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

DROP TRIGGER IF EXISTS trigger_create_task_assignment_notification ON tasks;
CREATE TRIGGER trigger_create_task_assignment_notification
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_assignment_notification();

CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids uuid[])
RETURNS void AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true 
  WHERE id = ANY(notification_ids) AND recipient_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_count()
RETURNS bigint AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM notifications WHERE recipient_id = auth.uid() AND is_read = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();