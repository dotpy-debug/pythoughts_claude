import { Smile, Heart, Laugh, Frown, Angry, Zap } from 'lucide-react';

type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

type ReactionPickerProps = {
  onSelect: (reaction: ReactionType) => void;
  onClose: () => void;
};

const reactions: { type: ReactionType; icon: React.ReactNode; label: string }[] = [
  { type: 'like', icon: <Smile size={24} />, label: 'Like' },
  { type: 'love', icon: <Heart size={24} />, label: 'Love' },
  { type: 'laugh', icon: <Laugh size={24} />, label: 'Laugh' },
  { type: 'wow', icon: <Zap size={24} />, label: 'Wow' },
  { type: 'sad', icon: <Frown size={24} />, label: 'Sad' },
  { type: 'angry', icon: <Angry size={24} />, label: 'Angry' },
];

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex space-x-2 z-50">
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => onSelect(reaction.type)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
            title={reaction.label}
          >
            <div className="text-gray-600 group-hover:scale-110 transition-transform">
              {reaction.icon}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
