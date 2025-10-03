import { useState } from 'react';
import { Smile } from 'lucide-react';

type Emoji = {
  name: string;
  emoji: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'heart' | 'fire' | 'clap' | 'thinking' | 'celebrate' | 'rocket';
};

const emojis: Emoji[] = [
  { name: 'Like', emoji: '👍', type: 'like' },
  { name: 'Love', emoji: '❤️', type: 'love' },
  { name: 'Laugh', emoji: '😂', type: 'laugh' },
  { name: 'Wow', emoji: '😮', type: 'wow' },
  { name: 'Sad', emoji: '😢', type: 'sad' },
  { name: 'Angry', emoji: '😠', type: 'angry' },
  { name: 'Heart', emoji: '💖', type: 'heart' },
  { name: 'Fire', emoji: '🔥', type: 'fire' },
  { name: 'Clap', emoji: '👏', type: 'clap' },
  { name: 'Thinking', emoji: '🤔', type: 'thinking' },
  { name: 'Celebrate', emoji: '🎉', type: 'celebrate' },
  { name: 'Rocket', emoji: '🚀', type: 'rocket' },
];

type EmojiReactionPickerProps = {
  onReact: (type: Emoji['type']) => void;
  userReactions?: Emoji['type'][];
  reactions?: Record<string, number>;
};

export function EmojiReactionPicker({ onReact, userReactions = [], reactions = {} }: EmojiReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (type: Emoji['type']) => {
    onReact(type);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 hover:border-terminal-green transition-colors"
      >
        <Smile size={16} className="text-gray-400" />
        <span className="text-sm text-gray-400 font-mono">React</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 flex flex-wrap gap-2 max-w-xs">
            {emojis.map((emoji) => {
              const count = reactions[emoji.type] || 0;
              const hasReacted = userReactions.includes(emoji.type);

              return (
                <button
                  key={emoji.type}
                  onClick={() => handleReact(emoji.type)}
                  className={`relative group hover:scale-125 transition-transform ${
                    hasReacted ? 'ring-2 ring-terminal-green rounded-full' : ''
                  }`}
                  title={emoji.name}
                >
                  <span className="text-2xl">{emoji.emoji}</span>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-terminal-green text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-gray-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {emoji.name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
