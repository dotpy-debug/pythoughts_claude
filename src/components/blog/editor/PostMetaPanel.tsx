/**
 * Post Meta Panel Component
 *
 * Right sidebar for editing blog post metadata:
 * - Title
 * - Summary/Excerpt
 * - Tags
 * - Category
 * - Cover image
 * - SEO metadata
 * - Status
 */

import { useState } from 'react';
import { BlogPost } from '../../../types/blog';
import { Settings, Tag, Image as ImageIcon } from 'lucide-react';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';

interface PostMetaPanelProps {
  post: Partial<BlogPost>;
  onChange: (post: Partial<BlogPost>) => void;
}

export function PostMetaPanel({ post, onChange }: PostMetaPanelProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && (!post.tags || !post.tags.includes(tagInput.trim()))) {
      onChange({
        ...post,
        tags: [...(post.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({
      ...post,
      tags: (post.tags || []).filter((t) => t !== tag),
    });
  };

  return (
    <aside className="hidden lg:block sticky top-24 bg-[#161b22]/70 backdrop-blur-md border border-white/10 rounded-xl p-4 max-h-[calc(100vh-120px)]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <Settings size={16} className="text-[#27C93F]" />
        <h3 className="text-sm font-semibold text-[#E6EDF3]">
          Post Settings
        </h3>
      </div>

      <ScrollArea className="h-full">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1">
              Title
            </label>
            <input
              type="text"
              value={post.title || ''}
              onChange={(e) => onChange({ ...post, title: e.target.value })}
              placeholder="Enter post title..."
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1">
              Summary
            </label>
            <textarea
              value={post.summary || ''}
              onChange={(e) => onChange({ ...post, summary: e.target.value })}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent resize-none"
            />
          </div>

          <Separator className="bg-white/10" />

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1 flex items-center gap-1">
              <Tag size={12} />
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-[#27C93F]/20 text-[#27C93F] rounded-lg text-sm font-medium hover:bg-[#27C93F]/30 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(post.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#27C93F]/10 text-[#27C93F] rounded-md text-xs border border-[#27C93F]/20"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-[#27C93F]/70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1">
              Category
            </label>
            <input
              type="text"
              value={post.category || ''}
              onChange={(e) => onChange({ ...post, category: e.target.value })}
              placeholder="Enter category..."
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
            />
          </div>

          <Separator className="bg-white/10" />

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1 flex items-center gap-1">
              <ImageIcon size={12} />
              Cover Image URL
            </label>
            <input
              type="text"
              value={post.cover_image || ''}
              onChange={(e) =>
                onChange({ ...post, cover_image: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
            />
            {post.cover_image && (
              <img
                src={post.cover_image}
                alt="Cover preview"
                className="mt-2 w-full h-32 object-cover rounded-lg border border-white/10"
              />
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* SEO Meta Title */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1">
              SEO Title
            </label>
            <input
              type="text"
              value={post.meta_title || ''}
              onChange={(e) =>
                onChange({ ...post, meta_title: e.target.value })
              }
              placeholder="Optional SEO title..."
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent"
            />
          </div>

          {/* SEO Meta Description */}
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3]/70 mb-1">
              SEO Description
            </label>
            <textarea
              value={post.meta_description || ''}
              onChange={(e) =>
                onChange({ ...post, meta_description: e.target.value })
              }
              placeholder="Optional SEO description..."
              rows={3}
              className="w-full px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-[#E6EDF3] placeholder:text-[#E6EDF3]/40 focus:outline-none focus:ring-2 focus:ring-[#27C93F] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
