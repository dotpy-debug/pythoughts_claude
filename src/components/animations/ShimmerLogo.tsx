import { memo } from 'react';
import { Terminal } from 'lucide-react';

interface ShimmerLogoProperties {
  /**
   * Show the "pythoughts.com" text next to the icon
   * @default true
   */
  showText?: boolean;

  /**
   * Size variant of the logo
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Custom className for additional styling
   */
  className?: string;

  /**
   * ARIA label for accessibility
   * @default "Pythoughts logo"
   */
  ariaLabel?: string;
}

const SIZE_CONFIG = {
  sm: { icon: 16, text: 'text-lg', container: 'w-8 h-8' },
  md: { icon: 20, text: 'text-xl', container: 'w-10 h-10' },
  lg: { icon: 28, text: 'text-3xl', container: 'w-14 h-14' },
  xl: { icon: 40, text: 'text-5xl', container: 'w-20 h-20' },
} as const;

/**
 * ShimmerLogo Component
 *
 * Terminal-themed logo with gradient shimmer effect
 * Optimized with React.memo and CSS-only animations
 *
 * @example
 * ```tsx
 * <ShimmerLogo size="lg" showText />
 * ```
 */
export const ShimmerLogo = memo(function ShimmerLogo({
  showText = true,
  size = 'md',
  className = '',
  ariaLabel = 'Pythoughts logo',
}: ShimmerLogoProperties) {
  const currentSize = SIZE_CONFIG[size];

  return (
    <div className={`flex items-center space-x-3 ${className}`} role="img" aria-label={ariaLabel}>
      {/* Logo Icon Container */}
      <div
        className={`${currentSize.container} bg-gradient-to-br from-terminal-green via-terminal-blue to-terminal-purple rounded-lg flex items-center justify-center shadow-lg shimmer-container relative overflow-hidden`}
        aria-hidden="true"
      >
        <div className="shimmer-overlay absolute inset-0" />
        <Terminal size={currentSize.icon} className="text-gray-900 relative z-10" />
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="font-mono" aria-hidden="true">
          <span className="text-terminal-green">$ </span>
          <span className={`${currentSize.text} font-bold text-gray-100 shimmer-text relative`}>
            pythoughts.com
          </span>
        </div>
      )}
    </div>
  );
});
