import { LucideIcon } from 'lucide-react';

type EmptyStateProperties = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProperties) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-700">
        <Icon size={48} className="text-gray-500" />
      </div>

      <h3 className="text-xl font-semibold text-gray-100 mb-2 font-mono">
        {title}
      </h3>

      <p className="text-gray-400 text-center max-w-md mb-6 font-mono text-sm">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-terminal-green text-gray-900 rounded font-mono font-semibold hover:bg-terminal-green/90 transition-colors shadow-lg hover:shadow-glow-green"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
