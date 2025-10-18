import { useState, useEffect, useCallback } from 'react';
import { supabase, Tag } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Check } from 'lucide-react';

type TagBadgeProps = {
  tag: Tag;
  onClick?: () => void;
  showFollowButton?: boolean;
};

export function TagBadge({ tag, onClick, showFollowButton = false }: TagBadgeProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkFollowing = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('tag_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('tag_id', tag.id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking tag follow:', error);
    }
  }, [user, tag.id]);

  useEffect(() => {
    if (showFollowButton) {
      checkFollowing();
    }
  }, [showFollowButton, checkFollowing]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('tag_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('tag_id', tag.id);
        setIsFollowing(false);
      } else {
        await supabase.from('tag_follows').insert({
          user_id: user.id,
          tag_id: tag.id,
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling tag follow:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm font-mono transition-colors ${
        onClick ? 'cursor-pointer hover:border-terminal-purple hover:text-terminal-purple' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-terminal-purple">#</span>
      <span className="text-gray-300">{tag.name}</span>
      {tag.post_count !== undefined && tag.post_count > 0 && (
        <span className="text-xs text-gray-500">({tag.post_count})</span>
      )}
      {showFollowButton && user && (
        <button
          onClick={handleFollow}
          disabled={loading}
          className={`ml-1 p-1 rounded-full transition-colors ${
            isFollowing
              ? 'bg-terminal-green text-gray-900'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={isFollowing ? 'Unfollow tag' : 'Follow tag'}
        >
          {isFollowing ? <Check size={12} /> : <Plus size={12} />}
        </button>
      )}
    </div>
  );
}

type TagInputProps = {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
};

export function TagInput({ selectedTags, onChange, maxTags = 5 }: TagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('post_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error loading tag suggestions:', error);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (input) {
        loadSuggestions(input);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [input, loadSuggestions]);

  const handleAddTag = (tagName: string) => {
    const normalizedTag = tagName.toLowerCase().trim();
    if (
      normalizedTag &&
      !selectedTags.includes(normalizedTag) &&
      selectedTags.length < maxTags
    ) {
      onChange([...selectedTags, normalizedTag]);
      setInput('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input) {
      e.preventDefault();
      handleAddTag(input);
    }
  };

  return (
    <div>
      <label className="block text-sm font-mono text-gray-300 mb-1.5">
        <span className="text-terminal-green">$ </span>Tags ({selectedTags.length}/{maxTags})
      </label>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-terminal-purple/20 border border-terminal-purple rounded-full text-sm font-mono"
            >
              <span className="text-terminal-purple">#</span>
              <span className="text-gray-300">{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {selectedTags.length < maxTags && (
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Add a tag..."
              className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-purple focus:ring-2 focus:ring-terminal-purple/20 transition-all duration-200 outline-none font-mono text-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {suggestions.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.name)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-terminal-purple font-mono">#</span>
                        <span className="text-gray-300 font-mono">{tag.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {tag.post_count} posts
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}