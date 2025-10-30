/**
 * Logo Component
 *
 * Unified logo component with predefined variants for different contexts
 * Wraps PyThoughtsLogo with convenience methods for consistent usage
 */

import PyThoughtsLogo from '../ui/pythoughts-logo';

interface LogoProps {
  /**
   * Show the "pythoughts.com" text
   * @default true
   */
  showText?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Custom className
   */
  className?: string;

  /**
   * Custom ARIA label
   */
  ariaLabel?: string;
}

// Size mapping to scale classes
const sizeScaleMap = {
  sm: 'scale-75',
  md: 'scale-90',
  lg: 'scale-100',
  xl: 'scale-125',
};

/**
 * Default Logo component
 *
 * @example
 * ```tsx
 * <Logo size="md" />
 * ```
 */
export function Logo({ showText = true, size = 'md', className, ariaLabel }: LogoProps) {
  const scaleClass = sizeScaleMap[size];
  const combinedClassName = `${scaleClass} ${className || ''}`.trim();

  return (
    <div aria-label={ariaLabel || 'PyThoughts logo'}>
      <PyThoughtsLogo compact={!showText} className={combinedClassName} />
    </div>
  );
}

/**
 * Navbar Logo - Compact size for header/navigation
 *
 * @example
 * ```tsx
 * <Logo.Navbar />
 * ```
 */
Logo.Navbar = function NavbarLogo() {
  return <Logo size="md" showText={true} ariaLabel="PyThoughts - Navigate to home" />;
};

/**
 * Footer Logo - Medium size for footer areas
 *
 * @example
 * ```tsx
 * <Logo.Footer />
 * ```
 */
Logo.Footer = function FooterLogo() {
  return <Logo size="lg" showText={true} ariaLabel="PyThoughts logo" />;
};

/**
 * Hero Logo - Large size for landing/hero sections
 *
 * @example
 * ```tsx
 * <Logo.Hero />
 * ```
 */
Logo.Hero = function HeroLogo() {
  return <Logo size="xl" showText={true} ariaLabel="PyThoughts - Neural Network Blog Platform" />;
};

/**
 * Icon Only Logo - Just the icon without text
 *
 * @example
 * ```tsx
 * <Logo.Icon size="sm" />
 * ```
 */
Logo.Icon = function IconLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return <Logo size={size} showText={false} ariaLabel="PyThoughts icon" />;
};

/**
 * Compact Logo - Small size for tight spaces
 *
 * @example
 * ```tsx
 * <Logo.Compact />
 * ```
 */
Logo.Compact = function CompactLogo() {
  return <Logo size="sm" showText={false} ariaLabel="PyThoughts" />;
};

/**
 * Mobile Logo - Optimized for mobile header
 *
 * @example
 * ```tsx
 * <Logo.Mobile />
 * ```
 */
Logo.Mobile = function MobileLogo() {
  return (
    <>
      <span className="sm:hidden">
        <Logo size="sm" showText={false} ariaLabel="PyThoughts" />
      </span>
      <span className="hidden sm:inline">
        <Logo size="md" showText={true} ariaLabel="PyThoughts" />
      </span>
    </>
  );
};
