/**
 * Database Type Definitions
 *
 * Core database schema types inferred from Supabase migrations.
 * These types provide compile-time safety for all database operations.
 */

/**
 * Profile (User) entity
 */
export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Post entity (blog posts and news)
 */
export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  author_id: string;
  post_type: 'blog' | 'news';
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[];
  series_id: string | null;
  publication_id: string | null;
  reading_time: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Post draft entity
 */
export interface PostDraft {
  id: string;
  title: string;
  content: string;
  author_id: string;
  post_type: 'blog' | 'news';
  image_url: string | null;
  category: string | null;
  tags: string[];
  series_id: string | null;
  publication_id: string | null;
  scheduled_publish_at: string | null;
  auto_saved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Comment entity
 */
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Claps (likes) entity
 */
export interface Clap {
  id: string;
  user_id: string;
  post_id: string;
  clap_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Bookmark entity
 */
export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  reading_list_id: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Reading list entity
 */
export interface ReadingList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Highlight entity
 */
export interface Highlight {
  id: string;
  user_id: string;
  post_id: string;
  highlighted_text: string;
  start_offset: number;
  end_offset: number;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  note: string | null;
  is_public: boolean;
  created_at: string;
}

/**
 * Series entity
 */
export interface Series {
  id: string;
  author_id: string;
  name: string;
  description: string | null;
  slug: string;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Series-Post junction entity
 */
export interface SeriesPost {
  id: string;
  series_id: string;
  post_id: string;
  order_index: number;
  created_at: string;
}

/**
 * Publication entity
 */
export interface Publication {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Publication member entity
 */
export interface PublicationMember {
  id: string;
  publication_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'writer';
  created_at: string;
}

/**
 * Category entity
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Tag entity
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

/**
 * Tag follower entity
 */
export interface TagFollower {
  id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

/**
 * Post version entity (version control)
 */
export interface PostVersion {
  id: string;
  post_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Content report entity
 */
export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment' | 'user';
  content_id: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'copyright' | 'other';
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

/**
 * Post view entity (analytics)
 */
export interface PostView {
  id: string;
  post_id: string;
  user_id: string | null;
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  created_at: string;
}

/**
 * Media asset entity
 */
export interface MediaAsset {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Reputation entity
 */
export interface Reputation {
  id: string;
  user_id: string;
  points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

/**
 * Badge entity
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  criteria: Record<string, unknown>;
  created_at: string;
}

/**
 * User badge entity
 */
export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

/**
 * Analytics event entity
 */
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  user_id: string | null;
  session_id: string;
  created_at: string;
}

/**
 * Collaboration document entity (Yjs)
 */
export interface CollaborationDocument {
  id: string;
  post_id: string;
  document_name: string;
  yjs_state: Uint8Array;
  created_at: string;
  updated_at: string;
}
