import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-logrocket-blue-100 text-logrocket-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  purple: 'bg-logrocket-purple-100 text-logrocket-purple-700',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${variantClasses[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}
