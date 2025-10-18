import { useState, useEffect, useRef } from 'react';
import { supabase, Tag } from '../../lib/supabase';
import { X, Plus } from 'lucide-react';

type TagInputProps = {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
};

export function TagInput({ selectedTags, onTagsChange, maxTags = 5 }: TagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch tag suggestions based on input
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!input.trim() || input.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .or(`name.ilike.%${input}%,slug.ilike.%${input}%`)
          .order('usage_count', { ascending: false })
          .limit(10);

        if (!error && data) {
          // Filter out already selected tags
          const filtered = data.filter(
            (tag) => !selectedTags.some((selected) => selected.id === tag.id)
          );
          setSuggestions(filtered);
        }
      } catch (error) {
        console.error('Error fetching tag suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [input, selectedTags]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createTag = (tagName: string): Tag => {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: '', // Will be generated on save
      name: tagName,
      slug,
      description: null,
      color: '#6B7280',
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const handleAddTag = (tag: Tag) => {
    if (selectedTags.length >= maxTags) return;
    if (selectedTags.some((t) => t.id === tag.id || t.name === tag.name)) return;

    onTagsChange([...selectedTags, tag]);
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter((tag) => tag.id !== tagToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (suggestions.length > 0 && showSuggestions) {
        // Add the first suggestion
        handleAddTag(suggestions[0]);
      } else if (input.trim() && selectedTags.length < maxTags) {
        // Create a new tag
        const newTag = createTag(input.trim());
        handleAddTag(newTag);
      }
    } else if (e.key === 'Backspace' && !input && selectedTags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 border border-gray-700 rounded bg-gray-800 min-h-[42px]">
        {selectedTags.map((tag) => (
          <span
            key={tag.id || tag.name}
            className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-mono border transition-colors"
            style={{
              backgroundColor: `${tag.color}20`,
              borderColor: tag.color,
              color: tag.color,
            }}
          >
            <span>{tag.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:opacity-75 transition-opacity"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {selectedTags.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder={selectedTags.length === 0 ? 'Add tags...' : ''}
              className="w-full bg-transparent text-gray-100 text-sm font-mono outline-none placeholder:text-gray-500"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && (input.length >= 2 || suggestions.length > 0) && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50 max-h-[200px] overflow-y-auto"
              >
                {loading ? (
                  <div className="px-3 py-2 text-xs text-gray-500 font-mono">Loading...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm font-mono text-gray-100">{tag.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {tag.usage_count} posts
                      </span>
                    </button>
                  ))
                ) : input.trim().length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const newTag = createTag(input.trim());
                      handleAddTag(newTag);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={14} className="text-terminal-green" />
                    <span className="text-sm font-mono text-gray-100">
                      Create "{input.trim()}"
                    </span>
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-gray-500">
          {selectedTags.length} / {maxTags} tags
        </span>
        {selectedTags.length >= maxTags && (
          <span className="text-yellow-500">Maximum tags reached</span>
        )}
      </div>
    </div>
  );
}
