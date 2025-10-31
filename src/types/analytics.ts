/**
 * Analytics Type Definitions
 *
 * Type-safe analytics interfaces for dashboard metrics, charts, and reports.
 */

/**
 * Time period for analytics queries
 */
export type AnalyticsPeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Metric value with optional trend
 */
export interface MetricValue {
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Dashboard statistics summary
 */
export interface DashboardStats {
  totalPosts: MetricValue;
  totalUsers: MetricValue;
  totalViews: MetricValue;
  totalClaps: MetricValue;
  totalComments: MetricValue;
  totalBookmarks: MetricValue;
  avgReadingTime: MetricValue;
  activeUsers: MetricValue;
}

/**
 * Time-series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

/**
 * Chart data for time-series visualization
 */
export interface TimeSeriesChartData {
  label: string;
  data: TimeSeriesDataPoint[];
  color?: string;
}

/**
 * Post performance metrics
 */
export interface PostPerformance {
  post_id: string;
  title: string;
  author: string;
  views: number;
  claps: number;
  comments: number;
  bookmarks: number;
  shares: number;
  avgReadTime: number;
  completionRate: number;
  published_at: string;
}

/**
 * User engagement metrics
 */
export interface UserEngagement {
  user_id: string;
  username: string;
  postsPublished: number;
  totalViews: number;
  totalClaps: number;
  totalComments: number;
  followerCount: number;
  reputationPoints: number;
  joined_at: string;
}

/**
 * Category performance metrics
 */
export interface CategoryPerformance {
  category: string;
  postCount: number;
  totalViews: number;
  avgClaps: number;
  avgComments: number;
  growthRate: number;
}

/**
 * Tag performance metrics
 */
export interface TagPerformance {
  tag: string;
  postCount: number;
  followerCount: number;
  totalViews: number;
  trending: boolean;
}

/**
 * Traffic source analytics
 */
export interface TrafficSource {
  source: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

/**
 * Geographic analytics
 */
export interface GeographicData {
  country: string;
  countryCode: string;
  users: number;
  sessions: number;
  pageviews: number;
}

/**
 * Device analytics
 */
export interface DeviceData {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserName: string;
  browserVersion: string;
  os: string;
  sessions: number;
  users: number;
}

/**
 * Reading behavior analytics
 */
export interface ReadingBehavior {
  avgReadTime: number;
  completionRate: number;
  scrollDepth: number;
  timeOnPage: number;
  bounceRate: number;
}

/**
 * Cohort analysis data
 */
export interface CohortData {
  cohort: string;
  cohortDate: string;
  userCount: number;
  retentionRates: number[];
}

/**
 * Funnel analysis step
 */
export interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

/**
 * A/B test variant data
 */
export interface ABTestVariant {
  variant: string;
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

/**
 * Export format for analytics data
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

/**
 * Analytics filter configuration
 */
export interface AnalyticsFilter {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  postIds?: string[];
  authorIds?: string[];
  categories?: string[];
  tags?: string[];
  publicationIds?: string[];
}

/**
 * Real-time analytics event
 */
export interface RealtimeEvent {
  eventType: 'pageview' | 'clap' | 'comment' | 'bookmark' | 'share';
  userId: string | null;
  postId: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Analytics query result
 */
export interface AnalyticsQueryResult<T> {
  data: T[];
  totalCount: number;
  period: AnalyticsPeriod;
  generatedAt: string;
}
