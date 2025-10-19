import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { ExternalServiceError, ErrorLogger } from './errors';
import { logger } from './logger';

// Initialize Supabase client with validated environment variables
export const supabase = (() => {
  try {
    logger.info('Initializing Supabase client', {
      url: env.VITE_SUPABASE_URL,
    });

    return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    const err = new ExternalServiceError(
      'Supabase',
      'Failed to initialize Supabase client',
      error instanceof Error ? error : undefined
    );
    ErrorLogger.logExternalService(err, 'supabase-init');
    throw err;
  }
})();

export type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  role: 'user' | 'moderator' | 'editor' | 'admin' | 'super_admin';
  is_admin: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  admin_notes: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  post_type: 'news' | 'blog';
  image_url: string;
  category: string;
  is_published: boolean;
  is_draft: boolean;
  published_at: string;
  reading_time_minutes: number;
  subtitle: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  featured: boolean;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  post_stats?: PostStats;
  tags?: Tag[];
  series?: Series[];
};

export type Comment = {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  parent_comment_id: string | null;
  depth: number;
  vote_count: number;
  is_deleted: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  replies?: Comment[];
};

export type Vote = {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  vote_type: 1 | -1;
  created_at: string;
};

export type Reaction = {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'heart' | 'fire' | 'clap' | 'thinking' | 'celebrate' | 'rocket';
  created_at: string;
  profiles?: Profile;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  assignee_id: string | null;
  creator_id: string;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  assignee?: Profile;
};

export type TaskComment = {
  id: string;
  content: string;
  author_id: string;
  task_id: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  changes: Record<string, unknown>;
  created_at: string;
  profiles?: Profile;
};

export type Notification = {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: 'post_reply' | 'comment_reply' | 'vote' | 'mention' | 'task_assigned';
  title: string;
  message: string;
  target_id: string;
  target_type: 'post' | 'comment' | 'task';
  is_read: boolean;
  created_at: string;
  profiles?: Profile;
};

export type NotificationPreferences = {
  id: string;
  user_id: string;
  post_replies: boolean;
  comment_replies: boolean;
  votes: boolean;
  mentions: boolean;
  task_assignments: boolean;
  browser_notifications: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSkill = {
  id: string;
  user_id: string;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number;
  created_at: string;
};

export type UserProfileExtended = {
  user_id: string;
  bio_extended: string;
  website: string;
  location: string;
  company: string;
  job_title: string;
  github_url: string;
  twitter_url: string;
  linkedin_url: string;
  total_posts: number;
  total_followers: number;
  total_following: number;
  created_at: string;
  updated_at: string;
};

export type UserFollow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type UserBlock = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type CanvasTask = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type PostDraft = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  post_type: 'news' | 'blog';
  image_url: string;
  category: string;
  tags: string[];
  series_id: string | null;
  publication_id: string | null;
  scheduled_publish_at: string | null;
  auto_saved_at: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type Clap = {
  id: string;
  user_id: string;
  post_id: string;
  clap_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};


export type Highlight = {
  id: string;
  user_id: string;
  post_id: string;
  highlighted_text: string;
  start_offset: number;
  end_offset: number;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple';
  note: string;
  is_public: boolean;
  created_at: string;
  profiles?: Profile;
  posts?: Post;
};

export type Series = {
  id: string;
  author_id: string;
  name: string;
  description: string;
  slug: string;
  cover_image_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  series_posts?: SeriesPost[];
};

export type SeriesPost = {
  id: string;
  series_id: string;
  post_id: string;
  order_index: number;
  created_at: string;
  series?: Series;
  posts?: Post;
};

export type Publication = {
  id: string;
  name: string;
  description: string;
  slug: string;
  logo_url: string;
  cover_image_url: string;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  publication_members?: PublicationMember[];
};

export type PublicationMember = {
  id: string;
  publication_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'writer';
  joined_at: string;
  publications?: Publication;
  profiles?: Profile;
};

export type PublicationSubmission = {
  id: string;
  publication_id: string;
  post_id: string;
  author_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  review_notes: string;
  submitted_at: string;
  reviewed_at: string | null;
  publications?: Publication;
  posts?: Post;
  profiles?: Profile;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string;
  follower_count: number;
  post_count: number;
  created_at: string;
};

export type PostTag = {
  id: string;
  post_id: string;
  tag_id: string;
  created_at: string;
  posts?: Post;
  tags?: Tag;
};

export type TagFollow = {
  id: string;
  user_id: string;
  tag_id: string;
  created_at: string;
  profiles?: Profile;
  tags?: Tag;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  post_count: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  post_id: string;
  progress_percentage: number;
  last_position: number;
  completed: boolean;
  reading_time_seconds: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  posts?: Post;
};

export type Bookmark = {
  id: string;
  user_id: string;
  post_id: string;
  reading_list_id: string | null;
  notes: string;
  created_at: string;
  profiles?: Profile;
  posts?: Post;
  reading_lists?: ReadingList;
};

export type ReadingList = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_public: boolean;
  slug?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  items?: Bookmark[];
  bookmarks?: Bookmark[];
};

export type ReadingListItem = {
  id: string;
  reading_list_id: string;
  post_id: string;
  added_at: string;
  notes: string | null;
  posts?: Post;
  reading_lists?: ReadingList;
};

export type PostView = {
  id: string;
  post_id: string;
  user_id: string | null;
  referrer: string;
  user_agent: string;
  created_at: string;
  posts?: Post;
  profiles?: Profile;
};

export type PostStats = {
  post_id: string;
  view_count: number;
  read_count: number;
  clap_count: number;
  bookmark_count: number;
  highlight_count: number;
  avg_read_time_seconds: number;
  engagement_score: number;
  updated_at: string;
};

export type PostVersion = {
  id: string;
  post_id: string;
  version_number: number;
  title: string;
  content: string;
  subtitle: string;
  image_url: string;
  category: string;
  changed_by: string;
  change_description: string;
  is_major_edit: boolean;
  created_at: string;
  profiles?: Profile;
};

export type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean | unknown>;
  created_at: string;
  updated_at: string;
};

export type AdminActivityLog = {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
  profiles?: Profile;
};

export type UserSuspension = {
  id: string;
  user_id: string;
  suspended_by: string;
  reason: string;
  suspension_type: 'warning' | 'temporary' | 'permanent';
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  appeal_status: 'none' | 'pending' | 'approved' | 'rejected';
  appeal_notes: string;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
  admin_profile?: Profile;
};

export type SystemSetting = {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
  description: string;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
};

export type ContentReport = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  report_type: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'copyright' | 'other';
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  assigned_to: string | null;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  reporter_profile?: Profile;
  reported_user_profile?: Profile;
  assigned_admin_profile?: Profile;
  posts?: Post;
  comments?: Comment;
};
