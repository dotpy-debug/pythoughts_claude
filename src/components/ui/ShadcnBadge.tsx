import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-terminal-green focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-terminal-green text-gray-900 hover:bg-terminal-blue',
        secondary:
          'border-transparent bg-gray-800 text-gray-100 hover:bg-gray-700',
        destructive:
          'border-transparent bg-red-500 text-white hover:bg-red-600',
        outline: 'text-gray-400 border-gray-700',
        success:
          'border-transparent bg-terminal-green/20 text-terminal-green border-terminal-green/30',
        warning:
          'border-transparent bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        info:
          'border-transparent bg-terminal-blue/20 text-terminal-blue border-terminal-blue/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ShadcnBadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function ShadcnBadge({ className, variant, ...props }: ShadcnBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
