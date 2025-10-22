/**
 * Logo Component
 *
 * Unified logo component with predefined variants for different contexts
 * Wraps ShimmerLogo with convenience methods for consistent usage
 */

import { ShimmerLogo } from '../animations/ShimmerLogo';

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

/**
 * Default Logo component
 *
 * @example
 * ```tsx
 * <Logo size="md" />
 * ```
 */
export function Logo({ showText = true, size = 'md', className, ariaLabel }: LogoProps) {
  return <ShimmerLogo showText={showText} size={size} className={className} ariaLabel={ariaLabel} />;
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
  return <ShimmerLogo size="md" showText={true} ariaLabel="Pythoughts - Navigate to home" />;
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
  return <ShimmerLogo size="lg" showText={true} ariaLabel="Pythoughts logo" />;
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
  return <ShimmerLogo size="xl" showText={true} ariaLabel="Pythoughts - Terminal Blog Platform" />;
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
  return <ShimmerLogo size={size} showText={false} ariaLabel="Pythoughts icon" />;
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
  return <ShimmerLogo size="sm" showText={false} ariaLabel="Pythoughts" />;
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
        <ShimmerLogo size="sm" showText={false} ariaLabel="Pythoughts" />
      </span>
      <span className="hidden sm:inline">
        <ShimmerLogo size="md" showText={true} ariaLabel="Pythoughts" />
      </span>
    </>
  );
};
