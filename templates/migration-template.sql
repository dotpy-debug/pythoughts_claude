-- Migration Template
-- Template for creating idempotent, transaction-safe migrations

-- Migration: {MIGRATION_NAME}
-- Description: {DESCRIPTION}
-- Date: {DATE}
-- Author: {AUTHOR}

BEGIN;

-- ============================================================================
-- IDEMPOTENT OPERATIONS
-- ============================================================================

-- Always use IF NOT EXISTS for CREATE operations
CREATE TABLE IF NOT EXISTS example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Use IF EXISTS for DROP operations
DROP INDEX IF EXISTS idx_example_name;

-- Use IF NOT EXISTS for CREATE INDEX
CREATE INDEX IF NOT EXISTS idx_example_name ON example_table(name);

-- ============================================================================
-- DATA MIGRATIONS (if needed)
-- ============================================================================

-- Safe data updates with WHERE clauses
-- UPDATE example_table 
-- SET name = 'new_name'
-- WHERE condition = 'value'
--   AND id NOT IN (SELECT id FROM example_table WHERE name = 'new_name');

-- ============================================================================
-- ROLLBACK SCRIPT (create separately as rollback_{VERSION}.sql)
-- ============================================================================

-- ROLLBACK operations go in a separate file:
-- DROP TABLE IF EXISTS example_table;
-- DROP INDEX IF EXISTS idx_example_name;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Add validation queries to verify migration success
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
--                  WHERE table_name = 'example_table') THEN
--     RAISE EXCEPTION 'Migration failed: table not created';
--   END IF;
-- END $$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All operations are wrapped in a transaction (BEGIN/COMMIT)
-- 2. Use IF NOT EXISTS / IF EXISTS for idempotency
-- 3. Never use DROP TABLE without IF EXISTS
-- 4. Always test migrations in development first
-- 5. Create corresponding rollback script
-- 6. Add validation queries to verify success

