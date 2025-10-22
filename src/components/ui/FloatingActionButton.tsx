/**
 * Floating Action Button (FAB) Component
 *
 * Terminal-styled FAB for quick actions on mobile devices
 * Supports multiple actions with expandable menu
 */

import { ReactNode, useState } from 'react';
import { Plus, X, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FABAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

interface FloatingActionButtonProps {
  /**
   * Primary action (shown on FAB when closed)
   */
  primaryAction?: () => void;

  /**
   * Additional actions (shown when FAB is expanded)
   */
  actions?: FABAction[];

  /**
   * Icon to display (default: Plus)
   */
  icon?: ReactNode;

  /**
   * Hide FAB on scroll down, show on scroll up
   * @default false
   */
  hideOnScroll?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-800 hover:bg-gray-700 text-gray-100',
  primary: 'bg-terminal-blue hover:bg-terminal-green text-gray-900',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

export function FloatingActionButton({
  primaryAction,
  actions = [],
  icon,
  hideOnScroll = false,
  className,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll detection for hide/show behavior
  useState(() => {
    if (!hideOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
        setIsExpanded(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });

  const handlePrimaryClick = () => {
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (primaryAction) {
      primaryAction();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB Container */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3',
          'transition-all duration-300 ease-out',
          !isVisible && hideOnScroll && 'translate-y-24 opacity-0',
          className
        )}
      >
        {/* Expanded Actions */}
        {isExpanded && actions.length > 0 && (
          <div className="flex flex-col-reverse gap-2 mb-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'group flex items-center gap-3 rounded-full shadow-lg',
                  'transition-all duration-200 ease-out',
                  'animate-in slide-in-from-bottom-2 fade-in',
                  variantClasses[action.variant || 'default']
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                aria-label={action.label}
              >
                <span className="px-4 py-2 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </span>
                <div className="w-12 h-12 flex items-center justify-center rounded-full">
                  {action.icon}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Primary FAB Button */}
        <button
          onClick={handlePrimaryClick}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg',
            'bg-terminal-blue hover:bg-terminal-green text-gray-900',
            'flex items-center justify-center',
            'transition-all duration-300 ease-out',
            'hover:scale-110 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2 focus:ring-offset-gray-900',
            isExpanded && 'rotate-45 bg-red-500 hover:bg-red-600'
          )}
          aria-label={isExpanded ? 'Close menu' : 'Open menu'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <X className="w-6 h-6" />
          ) : icon ? (
            icon
          ) : actions.length > 0 ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  );
}

/**
 * Simple FAB for single action
 *
 * @example
 * ```tsx
 * <SimpleFAB
 *   onClick={() => navigate('/create')}
 *   icon={<PlusIcon />}
 *   label="Create Post"
 * />
 * ```
 */
export function SimpleFAB({
  onClick,
  icon,
  label,
  hideOnScroll = true,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
  hideOnScroll?: boolean;
}) {
  return (
    <FloatingActionButton
      primaryAction={onClick}
      icon={icon}
      hideOnScroll={hideOnScroll}
      aria-label={label}
    />
  );
}
