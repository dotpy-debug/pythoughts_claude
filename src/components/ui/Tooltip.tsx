/**
 * Terminal-styled Tooltip Component
 *
 * Wraps Radix UI Tooltip with custom terminal aesthetics
 * Supports keyboard shortcuts display and delayed visibility
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...properties }, reference) => (
  <TooltipPrimitive.Content
    ref={reference}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md',
      'bg-gray-900 border border-gray-700',
      'px-3 py-1.5 text-sm text-gray-100',
      'shadow-lg shadow-black/20',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2',
      'data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2',
      'data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...properties}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TooltipProperties {
  /**
   * The content to display in the tooltip
   */
  content: React.ReactNode;

  /**
   * The element that triggers the tooltip
   */
  children: React.ReactNode;

  /**
   * Keyboard shortcut to display (e.g., "Ctrl+K")
   */
  shortcut?: string;

  /**
   * Which side of the trigger to display the tooltip
   * @default "top"
   */
  side?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * Delay before showing tooltip (ms)
   * @default 500
   */
  delayDuration?: number;

  /**
   * Custom className for tooltip content
   */
  className?: string;

  /**
   * Whether tooltip is disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * Terminal-styled Tooltip component
 *
 * @example
 * ```tsx
 * <Tooltip content="Create a new post" shortcut="Ctrl+N">
 *   <button>New Post</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  shortcut,
  side = 'top',
  delayDuration = 500,
  className,
  disabled = false,
}: TooltipProperties) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        <div className="flex items-center gap-2">
          <span>{content}</span>
          {shortcut && (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-gray-800 border border-gray-600 px-1.5 py-0.5 text-xs font-mono text-gray-400">
              {shortcut.split('+').map((key, index) => (
                <React.Fragment key={key}>
                  {index > 0 && <span className="text-gray-600">+</span>}
                  <span>{key}</span>
                </React.Fragment>
              ))}
            </kbd>
          )}
        </div>
      </TooltipContent>
    </TooltipRoot>
  );
}

/**
 * Simplified tooltip for quick use
 *
 * @example
 * ```tsx
 * <SimpleTooltip text="Delete">
 *   <TrashIcon />
 * </SimpleTooltip>
 * ```
 */
export function SimpleTooltip({
  text,
  children,
  side = 'top',
}: {
  text: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip content={text} side={side} delayDuration={300}>
      {children}
    </Tooltip>
  );
}

// Export primitives for advanced use cases
export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };
