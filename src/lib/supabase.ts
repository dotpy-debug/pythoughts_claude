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
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
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
  changes: Record<string, any>;
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
