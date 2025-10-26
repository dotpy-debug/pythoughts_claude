/**
 * Blog Hero Component
 *
 * Displays blog post header with:
 * - Cover image (optional)
 * - Title and subtitle
 * - Author information
 * - Reading time and publish date
 * - Tags
 * - Follow button
 */

import { BlogPost } from '../../../types/blog';
import { Clock, Calendar } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '../../ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface BlogHeroProps {
  post: BlogPost;
  onFollowClick?: () => void;
}

export function BlogHero({ post, onFollowClick }: BlogHeroProps) {
  return (
    <section className="relative mb-12">
      {/* Cover Image (optional) */}
      {post.cover_image && (
        <div className="relative w-full h-[400px] mb-8 rounded-2xl overflow-hidden">
          <img
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/50 to-transparent" />
        </div>
      )}

      {/* Hero Content */}
      <div className="bg-[#161b22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#E6EDF3] mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Subtitle */}
        {post.summary && (
          <p className="text-xl text-[#E6EDF3]/80 mb-6 leading-relaxed">
            {post.summary}
          </p>
        )}

        {/* Meta Row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-[#27C93F]/30">
              <AvatarImage
                src={post.author?.avatar_url}
                alt={post.author?.username}
              />
              <AvatarFallback className="bg-[#27C93F]/20 text-[#27C93F]">
                {post.author?.username?.[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-[#E6EDF3]">
                {post.author?.username || 'Anonymous'}
              </p>
              <div className="flex items-center gap-3 text-xs text-[#E6EDF3]/60">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {post.published_at &&
                    formatDistanceToNow(new Date(post.published_at), {
                      addSuffix: true,
                    })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {post.reading_time_minutes} min read
                </span>
              </div>
            </div>
          </div>

          {/* Follow Button (optional) */}
          {onFollowClick && (
            <button
              onClick={onFollowClick}
              className="px-4 py-2 bg-[#27C93F] text-[#0d1117] rounded-lg font-medium hover:bg-[#27C93F]/90 transition-colors text-sm"
            >
              Follow
            </button>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-[#27C93F]/10 text-[#27C93F] rounded-full text-xs font-medium border border-[#27C93F]/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
