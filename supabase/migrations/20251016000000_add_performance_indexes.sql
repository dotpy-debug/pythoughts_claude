-- ============================================================================
-- Performance Optimization Indexes - Phase 3
-- Date: 2025-10-16
-- Description: Composite indexes for common query patterns identified in
--              performance analysis. These indexes optimize the most frequently
--              executed queries across posts, comments, votes, and reactions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. POSTS TABLE - Most Critical Indexes
-- Used in: PostList, BlogGrid, trending algorithm, user profiles
-- ============================================================================

-- Optimize: Posts by type, published status, and vote ranking
-- Query: SELECT * FROM posts WHERE post_type = ? AND is_published = true ORDER BY vote_count DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_type_published_votes
ON posts(post_type, is_published, vote_count DESC, created_at DESC)
WHERE is_draft = false;

-- Optimize: Posts by category filtering
-- Query: SELECT * FROM posts WHERE category = ? AND is_published = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_category_published
ON posts(category, is_published, created_at DESC)
WHERE is_draft = false;

-- Optimize: User's posts lookup
-- Query: SELECT * FROM posts WHERE author_id = ? AND is_published = true
CREATE INDEX IF NOT EXISTS idx_posts_author_published
ON posts(author_id, is_published, created_at DESC);

-- ============================================================================
-- 2. TASKS TABLE - OR Query Optimization
-- Used in: TaskList with OR condition (creator_id OR assignee_id)
-- ============================================================================

-- Optimize: Tasks created by user with status filter
-- Query: SELECT * FROM tasks WHERE creator_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_tasks_creator_status
ON tasks(creator_id, status, created_at DESC);

-- Optimize: Tasks assigned to user with status filter
-- Query: SELECT * FROM tasks WHERE assignee_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
ON tasks(assignee_id, status, created_at DESC);

-- ============================================================================
-- 3. COMMENTS TABLE - Thread Queries
-- Used in: CommentSection for hierarchical comment threads
-- ============================================================================

-- Optimize: All comments for a post ordered chronologically
-- Query: SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_comments_post_created
ON comments(post_id, created_at ASC);

-- Optimize: Reply threads (parent-child relationships)
-- Query: SELECT * FROM comments WHERE parent_comment_id = ?
CREATE INDEX IF NOT EXISTS idx_comments_parent_depth
ON comments(parent_comment_id, depth);

-- ============================================================================
-- 4. VOTES TABLE - User Vote Lookups
-- Used in: PostList, CommentSection to show user's votes
-- ============================================================================

-- Optimize: User's votes on posts
-- Query: SELECT post_id, vote_type FROM votes WHERE user_id = ? AND post_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_votes_user_post
ON votes(user_id, post_id)
WHERE comment_id IS NULL;

-- Optimize: User's votes on comments
-- Query: SELECT comment_id, vote_type FROM votes WHERE user_id = ? AND comment_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_votes_user_comment
ON votes(user_id, comment_id)
WHERE post_id IS NULL;

-- ============================================================================
-- 5. TAGS TABLE - Search Optimization
-- Used in: TagInput for autocomplete/search functionality
-- ============================================================================

-- Enable trigram similarity extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimize: Tag search with ILIKE queries
-- Query: SELECT * FROM tags WHERE name ILIKE '%query%' ORDER BY post_count DESC
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
ON tags USING gin(name gin_trgm_ops);

-- Optimize: Popular tags ordering
-- Query: SELECT * FROM tags ORDER BY post_count DESC
CREATE INDEX IF NOT EXISTS idx_tags_post_count
ON tags(post_count DESC);

-- ============================================================================
-- 6. REACTIONS TABLE - Aggregation Queries
-- Used in: ReactionBar to count reactions by type
-- ============================================================================

-- Optimize: Reactions on posts grouped by type
-- Query: SELECT reaction_type, COUNT(*) FROM reactions WHERE post_id = ? GROUP BY reaction_type
CREATE INDEX IF NOT EXISTS idx_reactions_post_type
ON reactions(post_id, reaction_type);

-- Optimize: Reactions on comments grouped by type
-- Query: SELECT reaction_type, COUNT(*) FROM reactions WHERE comment_id = ? GROUP BY reaction_type
CREATE INDEX IF NOT EXISTS idx_reactions_comment_type
ON reactions(comment_id, reaction_type);

-- ============================================================================
-- 7. CLAPS TABLE - Aggregation Queries
-- Used in: ClapButton to sum total claps
-- ============================================================================

-- Optimize: Sum of claps for a post
-- Query: SELECT SUM(clap_count) FROM claps WHERE post_id = ?
CREATE INDEX IF NOT EXISTS idx_claps_post
ON claps(post_id, clap_count);

-- ============================================================================
-- 8. READING_PROGRESS TABLE - User Queries
-- Used in: ReadingProgressBar to load/save reading progress
-- ============================================================================

-- Optimize: User's reading history ordered by date
-- Query: SELECT * FROM reading_progress WHERE user_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_updated
ON reading_progress(user_id, updated_at DESC);

-- ============================================================================
-- 9. BOOKMARKS TABLE - User Queries
-- Used in: BookmarkButton to check bookmark status
-- ============================================================================

-- Optimize: User's bookmarks filtered by reading list
-- Query: SELECT * FROM bookmarks WHERE user_id = ? AND reading_list_id = ?
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_list
ON bookmarks(user_id, reading_list_id);

-- ============================================================================
-- 10. TAG_FOLLOWS TABLE - User Tag Queries
-- Used in: TagBadge to check if user follows a tag
-- ============================================================================

-- Optimize: User's followed tags
-- Query: SELECT * FROM tag_follows WHERE user_id = ? AND tag_id = ?
CREATE INDEX IF NOT EXISTS idx_tag_follows_user
ON tag_follows(user_id, tag_id);

COMMIT;

-- ============================================================================
-- UPDATE STATISTICS
-- Refresh query planner statistics after creating indexes
-- ============================================================================
ANALYZE posts;
ANALYZE tasks;
ANALYZE comments;
ANALYZE votes;
ANALYZE tags;
ANALYZE reactions;
ANALYZE claps;
ANALYZE reading_progress;
ANALYZE bookmarks;
ANALYZE tag_follows;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify index usage (look for "Index Scan" not "Seq Scan")
-- ============================================================================

-- Test 1: Posts query with type and published filter
-- EXPLAIN ANALYZE
-- SELECT * FROM posts
-- WHERE post_type = 'news' AND is_published = true AND is_draft = false
-- ORDER BY vote_count DESC, created_at DESC
-- LIMIT 50;

-- Test 2: Tag search with ILIKE
-- EXPLAIN ANALYZE
-- SELECT * FROM tags
-- WHERE name ILIKE '%python%'
-- ORDER BY post_count DESC
-- LIMIT 5;

-- Test 3: User votes lookup
-- EXPLAIN ANALYZE
-- SELECT post_id, vote_type FROM votes
-- WHERE user_id = 'some-uuid' AND post_id IS NOT NULL;

-- Test 4: Comments for a post
-- EXPLAIN ANALYZE
-- SELECT * FROM comments
-- WHERE post_id = 'some-uuid'
-- ORDER BY created_at ASC;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_posts_type_published_votes;
-- DROP INDEX IF EXISTS idx_posts_category_published;
-- DROP INDEX IF EXISTS idx_posts_author_published;
-- DROP INDEX IF EXISTS idx_tasks_creator_status;
-- DROP INDEX IF EXISTS idx_tasks_assignee_status;
-- DROP INDEX IF EXISTS idx_comments_post_created;
-- DROP INDEX IF EXISTS idx_comments_parent_depth;
-- DROP INDEX IF EXISTS idx_votes_user_post;
-- DROP INDEX IF EXISTS idx_votes_user_comment;
-- DROP INDEX IF EXISTS idx_tags_name_trgm;
-- DROP INDEX IF EXISTS idx_tags_post_count;
-- DROP INDEX IF EXISTS idx_reactions_post_type;
-- DROP INDEX IF EXISTS idx_reactions_comment_type;
-- DROP INDEX IF EXISTS idx_claps_post;
-- DROP INDEX IF EXISTS idx_reading_progress_user_updated;
-- DROP INDEX IF EXISTS idx_bookmarks_user_list;
-- DROP INDEX IF EXISTS idx_tag_follows_user;
-- DROP EXTENSION IF EXISTS pg_trgm;
