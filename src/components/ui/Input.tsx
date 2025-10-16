import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-mono text-gray-300 mb-1.5">
            <span className="text-terminal-green">$ </span>{label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`
              w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100
              focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20
              transition-all duration-200 outline-none font-mono
              placeholder:text-gray-500
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-400 font-mono">! {error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
