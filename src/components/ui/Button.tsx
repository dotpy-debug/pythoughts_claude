import { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'danger' | 'terminal' | 'default' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-terminal-blue text-gray-900 hover:bg-terminal-green shadow-sm hover:shadow-md hover:scale-105 active:scale-95',
  default: 'bg-terminal-green text-gray-900 hover:bg-terminal-blue shadow-sm hover:shadow-md hover:scale-105 active:scale-95',
  secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700 hover:scale-105 active:scale-95',
  outline: 'border-2 border-terminal-green text-terminal-green hover:bg-terminal-green/10 hover:scale-105 active:scale-95',
  ghost: 'text-gray-400 hover:bg-gray-800 hover:text-terminal-green hover:scale-105 active:scale-95',
  gradient: 'bg-gradient-purple text-white hover:shadow-glow-purple hover:scale-105 active:scale-95',
  danger: 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 active:scale-95',
  destructive: 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 active:scale-95',
  terminal: 'bg-terminal-green text-gray-900 hover:bg-terminal-blue font-mono font-semibold hover:scale-105 active:scale-95',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
  icon: 'p-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center space-x-2 rounded font-medium
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
