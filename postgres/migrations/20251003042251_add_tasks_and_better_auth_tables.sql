/*
  # Add Tasks Management and Better-Auth Support

  ## Overview
  This migration extends the Pythoughts platform with task management capabilities
  and Better-Auth session management tables.

  ## New Tables

  ### 1. tasks
  Task management with full project tracking
  - `id` (uuid, primary key) - Unique task identifier
  - `title` (text) - Task title/summary
  - `description` (text) - Detailed task description
  - `status` (text) - Task status: 'todo', 'in_progress', 'completed', 'archived'
  - `priority` (text) - Priority level: 'low', 'medium', 'high', 'urgent'
  - `due_date` (timestamptz) - Task deadline (nullable)
  - `assignee_id` (uuid, references profiles) - Assigned user
  - `creator_id` (uuid, references profiles) - Task creator
  - `tags` (text[]) - Array of tag strings
  - `completed_at` (timestamptz) - Completion timestamp (nullable)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. task_comments
  Comments specific to tasks
  - `id` (uuid, primary key) - Unique comment identifier
  - `content` (text) - Comment text
  - `author_id` (uuid, references profiles) - Comment author
  - `task_id` (uuid, references tasks) - Parent task
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. task_activity_log
  Audit trail for all task changes
  - `id` (uuid, primary key) - Unique log entry identifier
  - `task_id` (uuid, references tasks) - Related task
  - `user_id` (uuid, references profiles) - User who made the change
  - `action` (text) - Action type: 'created', 'updated', 'completed', 'commented', etc.
  - `changes` (jsonb) - JSON object containing before/after values
  - `created_at` (timestamptz) - Action timestamp

  ### 4. better_auth_sessions
  Session management for Better-Auth
  - `id` (uuid, primary key) - Session identifier
  - `user_id` (uuid, references profiles) - Session owner
  - `token` (text, unique) - Session token
  - `expires_at` (timestamptz) - Expiration timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. better_auth_accounts
  External account linking for Better-Auth
  - `id` (uuid, primary key) - Account identifier
  - `user_id` (uuid, references profiles) - Linked user
  - `provider` (text) - Auth provider name (email, google, github, etc.)
  - `provider_account_id` (text) - Provider's user identifier
  - `created_at` (timestamptz) - Link timestamp

  ## Security
  - Enable RLS on all new tables
  - Tasks: Users can read all tasks, create tasks, update/delete own tasks
  - Task Comments: Public read, authenticated users can create, authors can update/delete
  - Task Activity Log: Read-only for task viewers, auto-populated by triggers
  - Better-Auth tables: Restricted access, managed by auth system

  ## Indexes
  - Tasks: index on assignee_id, creator_id, status, priority, due_date
  - Task Comments: index on task_id, author_id
  - Task Activity Log: index on task_id, user_id, created_at
  - Better-Auth: index on user_id, token, expires_at

  ## Important Notes
  1. Task tags use PostgreSQL array type for flexible tagging
  2. Activity log uses JSONB for flexible change tracking
  3. Better-Auth tables support multiple authentication providers
  4. All tables follow the existing security patterns
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tags text[] DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Create task_activity_log table
CREATE TABLE IF NOT EXISTS task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;

-- Create better_auth_sessions table
CREATE TABLE IF NOT EXISTS better_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE better_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create better_auth_accounts table
CREATE TABLE IF NOT EXISTS better_auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);

ALTER TABLE better_auth_accounts ENABLE ROW LEVEL SECURITY;

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

-- Create indexes for task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at DESC);

-- Create indexes for task_activity_log
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user ON task_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created ON task_activity_log(created_at DESC);

-- Create indexes for better_auth_sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON better_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON better_auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON better_auth_sessions(expires_at);

-- Create indexes for better_auth_accounts
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user ON better_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_accounts_provider ON better_auth_accounts(provider, provider_account_id);

-- RLS Policies for tasks
CREATE POLICY "Tasks are viewable by everyone"
  ON tasks FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = assignee_id);

CREATE POLICY "Users can delete tasks they created"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for task_comments
CREATE POLICY "Task comments are viewable by everyone"
  ON task_comments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create task comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own task comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own task comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for task_activity_log
CREATE POLICY "Task activity is viewable by everyone"
  ON task_activity_log FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can insert task activity"
  ON task_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for better_auth_sessions
CREATE POLICY "Users can view own sessions"
  ON better_auth_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON better_auth_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON better_auth_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for better_auth_accounts
CREATE POLICY "Users can view own accounts"
  ON better_auth_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own account links"
  ON better_auth_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own account links"
  ON better_auth_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_activity_log (task_id, user_id, action, changes)
    VALUES (NEW.id, NEW.creator_id, 'created', jsonb_build_object('task', row_to_json(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO task_activity_log (task_id, user_id, action, changes)
    VALUES (
      NEW.id,
      auth.uid(),
      'updated',
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_activity_log (task_id, user_id, action, changes)
    VALUES (OLD.id, auth.uid(), 'deleted', jsonb_build_object('task', row_to_json(OLD)));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task activity logging
DROP TRIGGER IF EXISTS trigger_log_task_activity ON tasks;
CREATE TRIGGER trigger_log_task_activity
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Function to automatically set completed_at when task is marked completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-setting completed_at
DROP TRIGGER IF EXISTS trigger_set_task_completed_at ON tasks;
CREATE TRIGGER trigger_set_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON task_comments;
CREATE TRIGGER trigger_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();