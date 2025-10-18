import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from 'lucide-react';

type MentionUser = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type MentionsInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
};

export function MentionsInput({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
}: MentionsInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionsRef = useRef<HTMLDivElement>(null);

  // Fetch users for mentions autocomplete
  useEffect(() => {
    const fetchMentionUsers = async () => {
      if (!mentionQuery) {
        setMentionUsers([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `${mentionQuery}%`)
          .limit(5);

        if (error) throw error;
        setMentionUsers(data || []);
      } catch (error) {
        console.error('Error fetching mention users:', error);
        setMentionUsers([]);
      }
    };

    const debounce = setTimeout(fetchMentionUsers, 200);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionsRef.current &&
        !mentionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(cursor);

    // Check if we should show mentions
    const textBeforeCursor = newValue.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Only show mentions if there's no space after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const newValue =
        textBeforeCursor.substring(0, lastAtIndex) +
        `@${username} ` +
        textAfterCursor;

      onChange(newValue);
      setShowMentions(false);
      setMentionQuery('');

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = lastAtIndex + username.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newCursor;
          textareaRef.current.selectionEnd = newCursor;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || mentionUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % mentionUsers.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
        break;
      case 'Enter':
      case 'Tab':
        if (showMentions && mentionUsers[selectedIndex]) {
          e.preventDefault();
          insertMention(mentionUsers[selectedIndex].username);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMentions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {showMentions && mentionUsers.length > 0 && (
        <div
          ref={mentionsRef}
          className="absolute bottom-full left-0 mb-2 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-mono text-gray-500">
              Mention user (↑↓ to navigate, Enter to select)
            </span>
          </div>
          {mentionUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user.username)}
              className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                index === selectedIndex
                  ? 'bg-gray-800 border-l-2 border-terminal-green'
                  : 'hover:bg-gray-800 border-l-2 border-transparent'
              }`}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-8 h-8 rounded-full object-cover border border-terminal-purple"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-800 border border-terminal-purple rounded-full flex items-center justify-center">
                  <User size={16} className="text-terminal-purple" />
                </div>
              )}
              <span className="text-sm font-mono text-gray-100">@{user.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
