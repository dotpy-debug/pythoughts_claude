/**
 * Admin Dashboard Type Definitions
 *
 * Type-safe interfaces for admin panel components, system settings, and management features.
 */

import type { Profile, Post, Comment, ContentReport, Publication } from './database';
import type { DashboardStats } from './analytics';

/**
 * Admin permission levels
 */
export type AdminPermission =
  | 'manage_users'
  | 'manage_posts'
  | 'manage_comments'
  | 'manage_publications'
  | 'manage_settings'
  | 'manage_moderation'
  | 'view_analytics'
  | 'manage_categories'
  | 'manage_tags'
  | 'manage_media'
  | 'manage_permissions';

/**
 * Admin role with permissions
 */
export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User management row data
 */
export interface UserManagementRow extends Profile {
  postCount: number;
  commentCount: number;
  reputationPoints: number;
  lastActive: string | null;
  isBanned: boolean;
  banReason: string | null;
  roles: string[];
}

/**
 * User action for bulk operations
 */
export type UserAction = 'ban' | 'unban' | 'delete' | 'assign_role' | 'remove_role' | 'verify_email';

/**
 * Post management row data
 */
export interface PostManagementRow extends Post {
  authorName: string;
  authorAvatar: string | null;
  clapCount: number;
  commentCount: number;
  bookmarkCount: number;
  reportCount: number;
  isFlagged: boolean;
}

/**
 * Post action for bulk operations
 */
export type PostAction = 'publish' | 'unpublish' | 'archive' | 'delete' | 'feature' | 'unfeature';

/**
 * Comment management row data
 */
export interface CommentManagementRow extends Comment {
  authorName: string;
  authorAvatar: string | null;
  postTitle: string;
  reportCount: number;
  isFlagged: boolean;
}

/**
 * Comment action for bulk operations
 */
export type CommentAction = 'approve' | 'flag' | 'delete' | 'pin' | 'unpin';

/**
 * Content moderation queue item
 */
export interface ModerationQueueItem {
  id: string;
  contentType: 'post' | 'comment' | 'user';
  contentId: string;
  contentPreview: string;
  authorId: string;
  authorName: string;
  reportCount: number;
  reasons: string[];
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Moderation action
 */
export type ModerationAction = 'approve' | 'reject' | 'delete' | 'ban_user' | 'warn_user';

/**
 * Moderation decision record
 */
export interface ModerationDecision {
  reportId: string;
  action: ModerationAction;
  notes: string;
  moderatorId: string;
  timestamp: string;
}

/**
 * Publication management row data
 */
export interface PublicationManagementRow extends Publication {
  memberCount: number;
  postCount: number;
  followerCount: number;
  ownerName: string;
  isVerified: boolean;
}

/**
 * Publication action for bulk operations
 */
export type PublicationAction = 'verify' | 'unverify' | 'suspend' | 'delete' | 'feature';

/**
 * System setting category
 */
export type SettingCategory = 'general' | 'security' | 'email' | 'storage' | 'analytics' | 'moderation';

/**
 * System setting value types
 */
export type SettingValue = string | number | boolean | string[] | Record<string, unknown>;

/**
 * System setting definition
 */
export interface SystemSetting {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  value: SettingValue;
  defaultValue: SettingValue;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  updatedAt: string;
  updatedBy: string;
}

/**
 * Database table metadata
 */
export interface DatabaseTableInfo {
  name: string;
  schema: string;
  rowCount: number;
  sizeBytes: number;
  columns: DatabaseColumnInfo[];
  indexes: DatabaseIndexInfo[];
  foreignKeys: DatabaseForeignKeyInfo[];
}

/**
 * Database column metadata
 */
export interface DatabaseColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

/**
 * Database index metadata
 */
export interface DatabaseIndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

/**
 * Database foreign key metadata
 */
export interface DatabaseForeignKeyInfo {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

/**
 * Database query result
 */
export interface DatabaseQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

/**
 * Category/Tag management row
 */
export interface CategoryTagRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number;
  followerCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

/**
 * Admin dashboard overview data
 */
export interface AdminDashboardOverview {
  stats: DashboardStats;
  recentReports: ContentReport[];
  recentUsers: Profile[];
  recentPosts: Post[];
  systemHealth: SystemHealthMetrics;
}

/**
 * System health metrics
 */
export interface SystemHealthMetrics {
  databaseSize: number;
  databaseConnections: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  activeUsers: number;
  queueSize: number;
  lastBackup: string | null;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = unknown> {
  success: boolean;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ id: string; error: string }>;
  data?: T;
}
