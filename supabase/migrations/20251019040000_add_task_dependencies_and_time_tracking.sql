/*
  # Task Dependencies and Time Tracking

  Add support for task dependencies, templates, and time tracking to enhance task management capabilities.

  ## New Tables

  ### task_dependencies
  Defines blocking relationships between tasks
  - `id` (uuid, primary key)
  - `task_id` (uuid) - The task that is blocked
  - `depends_on_task_id` (uuid) - The task that must be completed first
  - `created_at` (timestamptz)
  - Unique constraint on (task_id, depends_on_task_id)

  ### task_templates
  Reusable task templates for recurring workflows
  - `id` (uuid, primary key)
  - `name` (text) - Template name
  - `description` (text) - Template description
  - `creator_id` (uuid) - Template creator
  - `title` (text) - Default task title
  - `task_description` (text) - Default task description
  - `priority` (text) - Default priority
  - `tags` (text[]) - Default tags
  - `estimated_hours` (integer) - Estimated completion time
  - `is_public` (boolean) - Whether template is shared
  - `created_at` (timestamptz)

  ### task_time_entries
  Time tracking for tasks
  - `id` (uuid, primary key)
  - `task_id` (uuid) - Related task
  - `user_id` (uuid) - User who tracked time
  - `started_at` (timestamptz) - Start time
  - `ended_at` (timestamptz) - End time (null if currently tracking)
  - `duration_seconds` (integer) - Calculated duration
  - `notes` (text) - Optional notes about the time entry
  - `created_at` (timestamptz)

  ## Features
  - Prevent circular dependencies via trigger
  - Calculate total time tracked per task
  - Auto-calculate duration on time entry completion
*/

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_description text DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags text[] DEFAULT '{}',
  estimated_hours integer DEFAULT 0,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Create task_time_entries table
CREATE TABLE IF NOT EXISTS task_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_creator ON task_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_public ON task_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user ON task_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_active ON task_time_entries(user_id, task_id) WHERE ended_at IS NULL;

-- RLS Policies for task_dependencies
CREATE POLICY "Task dependencies are viewable by everyone"
  ON task_dependencies FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create task dependencies"
  ON task_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
      AND (tasks.creator_id = auth.uid() OR tasks.assignee_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete task dependencies for their tasks"
  ON task_dependencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
      AND (tasks.creator_id = auth.uid() OR tasks.assignee_id = auth.uid())
    )
  );

-- RLS Policies for task_templates
CREATE POLICY "Public templates are viewable by everyone"
  ON task_templates FOR SELECT
  TO authenticated, anon
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create templates"
  ON task_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own templates"
  ON task_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete own templates"
  ON task_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for task_time_entries
CREATE POLICY "Time entries are viewable by task participants"
  ON task_time_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
      AND (tasks.creator_id = auth.uid() OR tasks.assignee_id = auth.uid())
    )
  );

CREATE POLICY "Users can create own time entries"
  ON task_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON task_time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON task_time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to prevent circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if adding this dependency would create a cycle
  IF EXISTS (
    WITH RECURSIVE dependency_chain AS (
      -- Start with the task being added as a dependency
      SELECT depends_on_task_id AS task_id
      FROM task_dependencies
      WHERE task_id = NEW.depends_on_task_id

      UNION

      -- Recursively find all tasks that depend on the current task
      SELECT td.depends_on_task_id
      FROM task_dependencies td
      INNER JOIN dependency_chain dc ON td.task_id = dc.task_id
    )
    SELECT 1 FROM dependency_chain WHERE task_id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Adding this dependency would create a circular reference';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for circular dependency check
DROP TRIGGER IF EXISTS trigger_check_circular_dependency ON task_dependencies;
CREATE TRIGGER trigger_check_circular_dependency
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_dependency();

-- Function to calculate time entry duration
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::integer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for time entry duration calculation
DROP TRIGGER IF EXISTS trigger_calculate_time_entry_duration ON task_time_entries;
CREATE TRIGGER trigger_calculate_time_entry_duration
  BEFORE INSERT OR UPDATE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Function to get total time tracked for a task
CREATE OR REPLACE FUNCTION get_task_total_time(task_uuid uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(duration_seconds), 0)::integer
  FROM task_time_entries
  WHERE task_id = task_uuid AND ended_at IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Function to check if task dependencies are complete
CREATE OR REPLACE FUNCTION are_task_dependencies_complete(task_uuid uuid)
RETURNS boolean AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM task_dependencies td
    INNER JOIN tasks t ON t.id = td.depends_on_task_id
    WHERE td.task_id = task_uuid
    AND t.status != 'completed'
  );
$$ LANGUAGE sql STABLE;
