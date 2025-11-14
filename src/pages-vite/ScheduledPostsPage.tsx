import { useEffect, useState, useCallback } from 'react';
import { Clock, Calendar, Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserScheduledPosts, cancelScheduledPost } from '../utils/scheduledPosts';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface ScheduledPost {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  post_type: 'news' | 'blog';
  category: string;
  scheduled_publish_at: string;
  created_at: string;
  updated_at: string;
}

export function ScheduledPostsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadScheduledPosts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const posts = await getUserScheduledPosts(user.id);
    setScheduledPosts(posts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadScheduledPosts();
    }
  }, [user, loadScheduledPosts]);

  const handleCancelSchedule = async (draftId: string) => {
    if (!user) return;

    setCancellingId(draftId);
    const success = await cancelScheduledPost(draftId, user.id);

    if (success) {
      // Remove from list
      setScheduledPosts(posts => posts.filter(p => p.id !== draftId));
    }

    setCancellingId(null);
  };

  const getTimeUntilPublish = (scheduledTime: string): string => {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMs = scheduled.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Publishing soon...';
    }

    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-gray-400 font-mono">Please sign in to view scheduled posts</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2 font-mono flex items-center space-x-3">
          <Clock size={32} className="text-terminal-green" />
          <span>Scheduled Posts</span>
        </h1>
        <p className="text-gray-400 font-mono text-sm">
          Manage your posts scheduled for future publishing
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-green"></div>
        </div>
      ) : (scheduledPosts.length === 0 ? (
        <div className="text-center py-20">
          <Clock size={64} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-mono mb-4">No scheduled posts</p>
          <Button
            onClick={() => navigate('/drafts')}
            variant="terminal"
            className="font-mono"
          >
            <Edit2 size={16} className="mr-2" />
            Create a Post
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduledPosts.map((post) => (
            <div
              key={post.id}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono">
                      {post.post_type}
                    </span>
                    {post.category && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-gray-100 mb-2 font-mono">
                    {post.title}
                  </h2>

                  {post.subtitle && (
                    <p className="text-sm text-gray-400 mb-3 font-mono italic">
                      {post.subtitle}
                    </p>
                  )}

                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 font-mono">
                    {post.content.slice(0, 200)}...
                  </p>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-terminal-green">
                      <Calendar size={16} />
                      <span className="font-mono">
                        {new Date(post.scheduled_publish_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock size={16} />
                      <span className="font-mono">
                        {getTimeUntilPublish(post.scheduled_publish_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => navigate(`/drafts?edit=${post.id}`)}
                    variant="ghost"
                    size="sm"
                    className="font-mono"
                    title="Edit post"
                  >
                    <Edit2 size={16} />
                  </Button>

                  <Button
                    onClick={() => handleCancelSchedule(post.id)}
                    disabled={cancellingId === post.id}
                    variant="ghost"
                    size="sm"
                    className="font-mono text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    title="Cancel scheduled publishing"
                  >
                    {cancellingId === post.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                    ) : (
                      <X size={16} />
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress bar showing time until publish */}
              <div className="mt-4">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-terminal-green transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((Date.now() - new Date(post.created_at).getTime()) /
                            (new Date(post.scheduled_publish_at).getTime() -
                              new Date(post.created_at).getTime())) *
                            100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {scheduledPosts.length > 0 && (
        <div className="mt-8 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <Clock size={20} className="text-terminal-green flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-1 font-mono">
                Automated Publishing
              </h3>
              <p className="text-xs text-gray-400 font-mono leading-relaxed">
                Your scheduled posts will be automatically published at the specified time.
                Posts are checked every minute and published when their scheduled time arrives.
                You can edit or cancel scheduled posts at any time before they're published.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
