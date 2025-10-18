import { FileText, MessageCircle, Bookmark, Users, Tag, TrendingUp, Search, Bell, Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

type EmptyStateActionProps = {
  onClick: () => void;
};

export function EmptyPosts({ onCreatePost }: { onCreatePost?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No posts yet"
      description="Be the first to share your thoughts and start the conversation."
      action={onCreatePost ? {
        label: "Create Your First Post",
        onClick: onCreatePost
      } : undefined}
    />
  );
}

export function EmptyComments() {
  return (
    <EmptyState
      icon={MessageCircle}
      title="No comments yet"
      description="Be the first to share your thoughts on this post. Start the discussion!"
    />
  );
}

export function EmptyBookmarks({ onBrowsePosts }: { onBrowsePosts?: () => void }) {
  return (
    <EmptyState
      icon={Bookmark}
      title="No bookmarks saved"
      description="Save posts to your bookmarks to read them later and keep track of interesting content."
      action={onBrowsePosts ? {
        label: "Browse Posts",
        onClick: onBrowsePosts
      } : undefined}
    />
  );
}

export function EmptyFollowers() {
  return (
    <EmptyState
      icon={Users}
      title="No followers yet"
      description="Share great content and engage with the community to grow your audience."
    />
  );
}

export function EmptyFollowing({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="Not following anyone"
      description="Discover interesting people to follow and stay updated with their latest posts."
      action={onExplore ? {
        label: "Explore Users",
        onClick: onExplore
      } : undefined}
    />
  );
}

export function EmptyTags({ onExploreTags }: { onExploreTags?: () => void }) {
  return (
    <EmptyState
      icon={Tag}
      title="No tags followed"
      description="Follow tags that interest you to personalize your feed and discover relevant content."
      action={onExploreTags ? {
        label: "Explore Tags",
        onClick: onExploreTags
      } : undefined}
    />
  );
}

export function EmptyTrending() {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No trending content"
      description="Check back soon! Trending posts will appear here as the community engages with content."
    />
  );
}

export function EmptySearch() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or explore different topics to find what you're looking for."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! Notifications about your posts and interactions will appear here."
    />
  );
}

export function EmptyDrafts({ onCreateDraft }: { onCreateDraft?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No drafts saved"
      description="Your draft posts will be saved here automatically. Start writing to create your first draft."
      action={onCreateDraft ? {
        label: "Start Writing",
        onClick: onCreateDraft
      } : undefined}
    />
  );
}

export function EmptyTasks({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No tasks yet"
      description="Create your first task to start organizing your work and tracking progress."
      action={onCreateTask ? {
        label: "Create Task",
        onClick: onCreateTask
      } : undefined}
    />
  );
}
