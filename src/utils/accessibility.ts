/**
 * Accessibility utilities for Pythoughts
 * WCAG 2.1 AA compliance helpers
 */

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return globalThis.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Get ARIA label for vote count
 */
export function getVoteAriaLabel(count: number, userVote?: 1 | -1 | null): string {
  const voteText = count === 1 ? 'vote' : 'votes';
  const userVoteText = userVote === 1 ? ', you upvoted' : (userVote === -1 ? ', you downvoted' : '');
  return `${count} ${voteText}${userVoteText}`;
}

/**
 * Get ARIA label for comment count
 */
export function getCommentAriaLabel(count: number): string {
  return count === 1 ? '1 comment' : `${count} comments`;
}

/**
 * Get ARIA label for reading time
 */
export function getReadingTimeAriaLabel(minutes: number): string {
  return minutes === 1 ? '1 minute read' : `${minutes} minutes read`;
}

/**
 * Get ARIA label for time ago
 */
export function getTimeAgoAriaLabel(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
}

/**
 * Check contrast ratio between two colors
 * Returns true if contrast meets WCAG AA standard (4.5:1 for normal text)
 */
export function hasGoodContrast(foreground: string, background: string): boolean {
  const ratio = getContrastRatio(foreground, background);
  return ratio >= 4.5;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.039_28 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.039_28 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.039_28 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Format number for screen readers
 */
export function formatNumberForScreenReader(number_: number): string {
  if (number_ < 1000) {
    return number_.toString();
  }

  if (number_ < 1_000_000) {
    const thousands = Math.floor(number_ / 100) / 10;
    return `${thousands} thousand`;
  }

  const millions = Math.floor(number_ / 100_000) / 10;
  return `${millions} million`;
}

/**
 * ARIA live region announcer
 */
class LiveAnnouncer {
  private politeElement: HTMLDivElement | null = null;
  private assertiveElement: HTMLDivElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Create polite announcer
    this.politeElement = document.createElement('div');
    this.politeElement.setAttribute('aria-live', 'polite');
    this.politeElement.setAttribute('aria-atomic', 'true');
    this.politeElement.className = 'sr-only';
    document.body.append(this.politeElement);

    // Create assertive announcer
    this.assertiveElement = document.createElement('div');
    this.assertiveElement.setAttribute('aria-live', 'assertive');
    this.assertiveElement.setAttribute('aria-atomic', 'true');
    this.assertiveElement.className = 'sr-only';
    document.body.append(this.assertiveElement);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const element = priority === 'polite' ? this.politeElement : this.assertiveElement;

    if (!element) {
      this.init();
      this.announce(message, priority);
      return;
    }

    // Clear previous message
    element.textContent = '';

    // Announce new message after a brief delay (helps screen readers)
    setTimeout(() => {
      element!.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        element!.textContent = '';
      }, 1000);
    }, 100);
  }
}

export const liveAnnouncer = new LiveAnnouncer();

/**
 * Validate ARIA attributes
 */
export function validateAriaAttributes(element: HTMLElement): string[] {
  const errors: string[] = [];

  // Check aria-labelledby references
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(' ');
    for (const id of ids) {
      if (!document.getElementById(id)) {
        errors.push(`aria-labelledby references non-existent ID: ${id}`);
      }
    }
  }

  // Check aria-describedby references
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const ids = describedBy.split(' ');
    for (const id of ids) {
      if (!document.getElementById(id)) {
        errors.push(`aria-describedby references non-existent ID: ${id}`);
      }
    }
  }

  // Check for common mistakes
  if (element.hasAttribute('aria-label') && element.hasAttribute('aria-labelledby')) {
    errors.push('Element has both aria-label and aria-labelledby (aria-labelledby takes precedence)');
  }

  return errors;
}

/**
 * Add focus visible styles only for keyboard navigation
 */
export function initFocusVisible() {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  };

  const handleMouseDown = () => {
    document.body.classList.remove('keyboard-nav');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  // Check if hidden
  if (element.hasAttribute('aria-hidden') && element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  // Check if display: none or visibility: hidden
  const styles = globalThis.getComputedStyle(element);
  if (styles.display === 'none' || styles.visibility === 'hidden') {
    return false;
  }

  // Check if has sr-only class but not focus
  if (element.classList.contains('sr-only') && element !== document.activeElement) {
    return true; // sr-only is specifically for screen readers
  }

  return true;
}

/**
 * Screen reader only class for CSS
 */
export const SR_ONLY_CLASS =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';
