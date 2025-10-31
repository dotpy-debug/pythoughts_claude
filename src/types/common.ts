/**
 * Common Type Definitions
 *
 * This file contains shared type definitions used across the application
 * to eliminate `any` types and provide strong type safety.
 */

// ============================================================================
// Database Record Types
// ============================================================================

/**
 * Generic database record with unknown structure
 * Use this instead of `any` when the exact structure is not known
 */
export type DatabaseRecord = Record<string, unknown>;

/**
 * Array of database records
 */
export type DatabaseRecords = DatabaseRecord[];

// ============================================================================
// Profile Related Types
// ============================================================================

/**
 * Basic profile information returned from database joins
 */
export interface ProfileBasic {
  id: string;
  username: string;
  display_username?: string;
  avatar_url: string | null;
}

/**
 * Extended profile with bio
 */
export interface ProfileWithBio extends ProfileBasic {
  bio: string | null;
}

// ============================================================================
// Post Related Types
// ============================================================================

/**
 * Post statistics structure
 */
export interface PostStats {
  view_count: number;
  read_time?: number;
}

/**
 * Post with engagement data
 */
export interface PostWithEngagement {
  vote_count: number;
  comment_count: number;
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * Generic update operation fields
 */
export interface UpdateFields {
  updated_at: string;
  [key: string]: unknown;
}

/**
 * Supabase query result with related data
 * Use for complex joins where the exact structure varies
 */
export interface RelatedData<T = DatabaseRecord> {
  [key: string]: T | T[] | null;
}

// ============================================================================
// Publication Types
// ============================================================================

/**
 * Publication member with profile data from joins
 */
export interface PublicationMemberWithProfile {
  id: string;
  publication_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'writer' | 'contributor';
  can_publish: boolean;
  can_edit_others: boolean;
  can_delete_posts: boolean;
  can_manage_members: boolean;
  can_manage_settings: boolean;
  post_count: number;
  joined_at: string;
  profiles: ProfileBasic;
}

/**
 * Publication submission with related data
 */
export interface PublicationSubmissionWithRelations {
  id: string;
  publication_id: string;
  post_id: string;
  submitter_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  reviewer_id: string | null;
  review_notes: string | null;
  submission_notes: string | null;
  created_at: string;
  publications: {
    id: string;
    name: string;
    slug: string;
  } | null;
  posts: {
    id: string;
    title: string;
  } | null;
  submitter: ProfileBasic | null;
  reviewer: ProfileBasic | null;
}

// ============================================================================
// Tag Types
// ============================================================================

/**
 * Post tag join result
 */
export interface PostTagJoin {
  tag_id: string;
  tags: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    follower_count: number;
    post_count: number;
    created_at: string;
  } | null;
  posts: {
    created_at: string;
    vote_count: number;
    comment_count: number;
    is_published: boolean;
    author_id: string;
  } | null;
}

/**
 * Tag with following status
 */
export interface TagFollowJoin {
  tags: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    follower_count: number;
    post_count: number;
    created_at: string;
  } | null;
}

// ============================================================================
// Version Comparison Types
// ============================================================================

/**
 * Field change tracking
 */
export interface FieldChange<T = string> {
  old: T;
  new: T;
}

/**
 * Content change with length difference
 */
export interface ContentChange extends FieldChange {
  lengthDiff: number;
}

/**
 * Version comparison changes
 */
export interface VersionChanges {
  title?: FieldChange;
  content?: ContentChange;
  subtitle?: FieldChange<string | null>;
  image_url?: FieldChange<string | null>;
  category?: FieldChange<string | null>;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Time series data
 */
export interface TimeSeriesData extends ChartDataPoint {
  date?: Date;
}

// ============================================================================
// System Settings Types
// ============================================================================

/**
 * Generic system setting value
 * Settings can have various structures
 */
export type SettingValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | null;

/**
 * Featured tags setting structure
 */
export interface FeaturedTagsSetting {
  tags: string[];
}

// ============================================================================
// Error and Result Types
// ============================================================================

/**
 * Standard error object
 */
export interface ErrorDetails {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Generic success/error result
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specified keys required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract non-null values
 */
export type NonNullable<T> = Exclude<T, null | undefined>;

/**
 * JSON-serializable value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * JSON object
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Type-safe keys
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// ============================================================================
// Post/Tag Join Complex Types
// ============================================================================

/**
 * Nested profile in post joins
 */
export interface NestedProfile {
  id: string;
  username: string;
  display_username?: string;
  avatar_url: string | null;
  bio?: string | null;
}

/**
 * Post with profile from join
 */
export interface PostWithProfile {
  author_id: string;
  profiles: NestedProfile | NestedProfile[];
}

// ============================================================================
// Reputation Types
// ============================================================================

/**
 * User reputation with profile data
 */
export interface UserReputationWithProfile {
  user_id: string;
  reputation_points: number;
  level: number;
  posts_created: number;
  comments_made: number;
  upvotes_received: number;
  helpful_count: number;
  updated_at: string;
  profiles?: ProfileWithBio;
}

// ============================================================================
// Admin Log Types
// ============================================================================

/**
 * Admin activity log details
 */
export type AdminActivityDetails = JsonObject;
