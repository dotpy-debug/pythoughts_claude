/*
  # Dynamic Category Management System

  ## Overview
  Creates a categories table for dynamic category management instead of hardcoded categories.
  Allows admins to create, edit, and manage categories with colors, icons, and descriptions.

  ## New Table: categories
  - `id` (uuid, primary key) - Unique category identifier
  - `name` (text, unique) - Category name (e.g., "Technology", "Design")
  - `slug` (text, unique) - URL-friendly identifier
  - `description` (text) - Category description
  - `color` (text) - Hex color code for visual distinction
  - `icon` (text) - Icon name or emoji for category
  - `post_count` (integer) - Cached count of posts in this category
  - `is_active` (boolean) - Whether category is active/visible
  - `display_order` (integer) - Sort order for displaying categories
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on categories table
  - Everyone can view active categories
  - Only admins can create/update/delete categories

  ## Indexes
  - Index on slug for fast lookups
  - Index on is_active for filtering
  - Index on display_order for sorting
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#6b7280' CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  icon text DEFAULT '📁',
  post_count integer DEFAULT 0 CHECK (post_count >= 0),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- RLS Policies
CREATE POLICY "Active categories are viewable by everyone"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to update category post count
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If category changed or new post
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.category != NEW.category) THEN
      -- Increment new category count
      UPDATE categories
      SET post_count = post_count + 1
      WHERE slug = NEW.category;

      -- Decrement old category count if update
      IF TG_OP = 'UPDATE' AND OLD.category IS NOT NULL AND OLD.category != '' THEN
        UPDATE categories
        SET post_count = GREATEST(post_count - 1, 0)
        WHERE slug = OLD.category;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement category count
    IF OLD.category IS NOT NULL AND OLD.category != '' THEN
      UPDATE categories
      SET post_count = GREATEST(post_count - 1, 0)
      WHERE slug = OLD.category;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update category post counts
DROP TRIGGER IF EXISTS trigger_update_category_post_count ON posts;
CREATE TRIGGER trigger_update_category_post_count
  AFTER INSERT OR UPDATE OF category OR DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_category_post_count();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, description, color, icon, display_order, is_active) VALUES
  ('Technology', 'technology', 'Software, hardware, and tech innovations', '#3b82f6', '💻', 1, true),
  ('Design', 'design', 'UI/UX, graphic design, and visual creativity', '#8b5cf6', '🎨', 2, true),
  ('Engineering', 'engineering', 'Software engineering, architecture, and best practices', '#10b981', '⚙️', 3, true),
  ('Product', 'product', 'Product management, strategy, and development', '#f59e0b', '📦', 4, true),
  ('Business', 'business', 'Startups, entrepreneurship, and business strategy', '#ef4444', '💼', 5, true),
  ('Culture', 'culture', 'Team culture, workplace, and company values', '#ec4899', '🌟', 6, true),
  ('Tutorial', 'tutorial', 'Step-by-step guides and how-tos', '#06b6d4', '📚', 7, true),
  ('News', 'news', 'Industry news and updates', '#64748b', '📰', 8, true),
  ('Opinion', 'opinion', 'Thoughts, perspectives, and commentary', '#6366f1', '💭', 9, true),
  ('Career', 'career', 'Professional development and career advice', '#14b8a6', '🚀', 10, true)
ON CONFLICT (slug) DO NOTHING;
