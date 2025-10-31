import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, List, Settings, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Series, Post } from '../lib/supabase';
import { ShadcnButton } from '../components/ui/ShadcnButton';

export function SeriesDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [series, setSeries] = useState<Series | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);

  const loadSeries = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Load series
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select(`
          *,
          profiles:author_id (username, avatar_url)
        `)
        .eq('slug', slug)
        .single();

      if (seriesError) throw seriesError;
      setSeries(seriesData);
      setIsAuthor(user?.id === seriesData.author_id);

      // Load series posts in order
      const { data: seriesPostsData, error: postsError } = await supabase
        .from('series_posts')
        .select(`
          *,
          posts (*)
        `)
        .eq('series_id', seriesData.id)
        .order('order_index', { ascending: true });

      if (postsError) throw postsError;

      const orderedPosts = seriesPostsData
        ?.map((sp: { posts?: unknown }) => sp.posts)
        .filter((post): post is Post => post !== null) || [];

      setPosts(orderedPosts);
    } catch (error) {
      console.error('Error loading series:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  }, [slug, user, navigate]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-terminal-green" size={48} />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <List size={48} className="text-gray-600 mx-auto" />
          <p className="text-gray-400">Series not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cover */}
      {series.cover_image_url ? (
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-64 overflow-hidden">
          <img
            src={series.cover_image_url}
            alt={series.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        </div>
      ) : (
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-64 bg-gradient-to-br from-terminal-purple/20 to-terminal-blue/20 flex items-center justify-center">
          <List size={96} className="text-terminal-purple/30" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-100 mb-2">{series.name}</h1>
          <p className="text-gray-400 text-lg">{series.description}</p>
          <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500 font-mono">
            <span>{posts.length} posts</span>
            <span>•</span>
            <span>by {(series.profiles as { username?: string } | null)?.username || 'Unknown'}</span>
          </div>
        </div>

        {isAuthor && (
          <ShadcnButton
            variant="outline"
            onClick={() => navigate(`/series/${series.slug}/edit`)}
          >
            <Settings className="mr-2" size={16} />
            Edit Series
          </ShadcnButton>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> posts_in_series
        </h2>

        {posts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <List size={48} className="text-gray-600 mx-auto" />
              <p className="text-gray-400">No posts in this series yet</p>
              {isAuthor && (
                <ShadcnButton onClick={() => navigate(`/series/${series.slug}/edit`)}>
                  Add Posts to Series
                </ShadcnButton>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post)}
                className="flex items-start space-x-4 bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-terminal-green cursor-pointer transition-all duration-220 group"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-terminal-purple/20 border border-terminal-purple rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold text-terminal-purple font-mono">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-terminal-green transition-colors mb-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                    {post.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{post.vote_count} votes</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-gray-600 group-hover:text-terminal-green transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
