import { memo } from 'react';
import { User, Clock } from 'lucide-react';
import { Post } from '../../lib/supabase';
import { formatDistanceToNow } from '../../utils/dateUtils';

type BlogCardProperties = {
  post: Post;
  onClick: () => void;
  featured?: boolean;
};

export const BlogCard = memo(function BlogCard({ post, onClick, featured = false }: BlogCardProperties) {
  const readTime = post.reading_time_minutes || Math.ceil(post.content.length / 1000);

  if (featured) {
    return (
      <div className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow mb-8 group">
        <div
          onClick={onClick}
          className="cursor-pointer"
        >
          {post.image_url && (
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-96 object-cover"
            />
          )}
          <div className="p-8">
            {post.category && (
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {post.category}
              </span>
            )}
            <h2 className="text-3xl font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors">
              {post.title}
            </h2>
            <p className="text-gray-600 text-lg mb-6 line-clamp-3">
              {post.content}
            </p>
            <div className="flex items-center space-x-4">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User size={20} />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {post.profiles?.username || 'Unknown'}
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{formatDistanceToNow(post.created_at)}</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    <span>{readTime} min read</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
    >
      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6 flex-1 flex flex-col">
        {post.category && (
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full mb-3 self-start">
            {post.category}
          </span>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
          {post.content}
        </p>
        <div className="flex items-center space-x-3 mt-auto">
          {post.profiles?.avatar_url ? (
            <img
              src={post.profiles.avatar_url}
              alt={post.profiles.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {post.profiles?.username || 'Unknown'}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formatDistanceToNow(post.created_at)}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{readTime} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
