import { useState, useEffect } from 'react';
import { supabase, Tag } from '../../lib/supabase';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

type TagFilterProperties = {
  selectedTags: string[]; // Array of tag slugs
  onTagsChange: (tagSlugs: string[]) => void;
};

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProperties) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadPopularTags();
  }, []);

  const loadPopularTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(20);

      if (!error && data) {
        setTags(data);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (slug: string) => {
    if (selectedTags.includes(slug)) {
      onTagsChange(selectedTags.filter((s) => s !== slug));
    } else {
      onTagsChange([...selectedTags, slug]);
    }
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  const visibleTags = isExpanded ? tags : tags.slice(0, 10);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="animate-pulse flex space-x-2">
          <div className="h-6 w-16 bg-gray-700 rounded"></div>
          <div className="h-6 w-20 bg-gray-700 rounded"></div>
          <div className="h-6 w-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-gray-100 font-mono text-sm">Filter by Tags</span>
          {selectedTags.length > 0 && (
            <span className="text-xs bg-terminal-purple/20 text-terminal-purple px-2 py-0.5 rounded font-mono border border-terminal-purple/30">
              {selectedTags.length} selected
            </span>
          )}
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAllTags}
            className="text-xs text-gray-400 hover:text-terminal-pink transition-colors font-mono flex items-center space-x-1"
          >
            <X size={12} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {visibleTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.slug);
            return (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.slug)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all ${
                  isSelected
                    ? 'border-terminal-green bg-terminal-green/20 text-terminal-green'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <span className="text-terminal-purple">#</span>
                <span>{tag.name}</span>
                <span className="text-[10px] opacity-70">({tag.post_count})</span>
              </button>
            );
          })}
        </div>

        {tags.length > 10 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 w-full text-xs text-gray-500 hover:text-terminal-green transition-colors font-mono flex items-center justify-center space-x-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={12} />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown size={12} />
                <span>Show More ({tags.length - 10} more)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
