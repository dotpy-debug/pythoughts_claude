import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-mono transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-terminal-green text-gray-900 hover:bg-terminal-blue shadow-md hover:shadow-lg',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 shadow-md',
        outline:
          'border border-terminal-green text-terminal-green bg-transparent hover:bg-terminal-green/10',
        secondary:
          'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700',
        ghost: 'text-gray-400 hover:bg-gray-800 hover:text-terminal-green',
        link: 'text-terminal-blue underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ShadcnButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const ShadcnButton = forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

ShadcnButton.displayName = 'ShadcnButton';
