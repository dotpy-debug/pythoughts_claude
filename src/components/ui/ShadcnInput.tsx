import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ShadcnInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const ShadcnInput = forwardRef<HTMLInputElement, ShadcnInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 font-mono',
          'ring-offset-gray-950 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-terminal-green focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

ShadcnInput.displayName = 'ShadcnInput';
