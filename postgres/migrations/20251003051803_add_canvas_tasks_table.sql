/*
  # Canvas Tasks Table

  ## New Tables
  
  ### canvas_tasks
  Infinite canvas tasks for n8n-style visual task management
  - `id` (uuid, primary key) - Unique task identifier
  - `user_id` (uuid, references profiles) - User who owns the task
  - `title` (text) - Task title
  - `description` (text) - Task description
  - `x` (integer) - X position on canvas
  - `y` (integer) - Y position on canvas
  - `color` (text) - Task color for visual identification
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - Enable RLS
  - Users can only manage their own canvas tasks
  - Users can view other users' tasks if shared (future feature)
  
  ## Indexes
  - Index on user_id for fast queries
*/

CREATE TABLE IF NOT EXISTS canvas_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  x integer DEFAULT 0,
  y integer DEFAULT 0,
  color text DEFAULT '#A6E3A1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE canvas_tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_canvas_tasks_user ON canvas_tasks(user_id);

CREATE POLICY "Users can view own canvas tasks"
  ON canvas_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own canvas tasks"
  ON canvas_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas tasks"
  ON canvas_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas tasks"
  ON canvas_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_canvas_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_canvas_tasks_updated_at ON canvas_tasks;
CREATE TRIGGER trigger_canvas_tasks_updated_at
  BEFORE UPDATE ON canvas_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_tasks_updated_at();