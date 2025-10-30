import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ShadcnInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const ShadcnInput = forwardRef<HTMLInputElement, ShadcnInputProps>(
  ({ className, type, label, error, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    if (label || error) {
      return (
        <div className="space-y-2">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-mono font-medium text-gray-300">
              {label}
            </label>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              'flex h-10 w-full rounded-md border px-3 py-2 text-sm text-gray-100 font-mono',
              'ring-offset-gray-950 file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500 bg-red-900/10 focus-visible:ring-red-500'
                : 'border-gray-700 bg-gray-800 focus-visible:ring-terminal-green',
              className
            )}
            ref={ref}
            {...props}
          />
          {error && (
            <p className="text-sm text-red-400 font-mono">{error}</p>
          )}
        </div>
      );
    }

    return (
      <input
        id={inputId}
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
