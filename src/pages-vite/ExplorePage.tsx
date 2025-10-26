import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, Tag, Users } from 'lucide-react';
import { Post } from '../lib/supabase';
import { TagExploration } from '../components/tags/TagExploration';
import { AuthorRecommendations } from '../components/discovery/AuthorRecommendations';

const PostList = lazy(() => import('../components/posts/PostList').then(mod => ({ default: mod.PostList })));

export function ExplorePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'trending' | 'tags' | 'users'>('trending');

  const handlePostClick = (post: Post) => {
    navigate(`/post/${post.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100 font-mono">
          <span className="text-terminal-green">$</span> explore
        </h1>
        <p className="text-gray-400 font-mono text-sm mt-2">
          Discover trending posts, popular tags, and interesting users
        </p>
      </div>

      <div className="flex space-x-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'trending'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <TrendingUp className="inline mr-2" size={16} />
          Trending
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'tags'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Tag className="inline mr-2" size={16} />
          Tags
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-mono transition-colors ${
            activeTab === 'users'
              ? 'text-terminal-green border-b-2 border-terminal-green'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <Users className="inline mr-2" size={16} />
          Users
        </button>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-terminal-green" size={48} />
        </div>
      }>
        {activeTab === 'trending' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 font-mono mb-4">
                <span className="text-terminal-green">$</span> trending_posts
              </h2>
              <p className="text-gray-400 mb-4">Discover the most popular content right now</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-100 font-mono mb-4">
                <span className="text-terminal-green">$</span> all_posts
              </h2>
              <PostList postType="news" onPostClick={handlePostClick} />
            </div>
          </div>
        )}

        {activeTab === 'tags' && <TagExploration />}

        {activeTab === 'users' && <AuthorRecommendations />}
      </Suspense>
    </div>
  );
}
