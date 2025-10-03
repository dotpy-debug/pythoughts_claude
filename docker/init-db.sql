-- PostgreSQL initialization script for Pythoughts Platform
-- This script runs automatically when the database container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create database schema
COMMENT ON DATABASE pythoughts_dev IS 'Pythoughts Platform Development Database';

-- Initial setup complete
SELECT 'Database initialized successfully!' AS status;
