import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type CardProps = {
  className?: string;
  children: ReactNode;
  /**
   * Enable hover lift effect
   * @default false
   */
  hover?: boolean;
  /**
   * Make card clickable with onClick handler
   */
  onClick?: () => void;
};

type CardHeaderProps = {
  className?: string;
  children: ReactNode;
};

type CardTitleProps = {
  className?: string;
  children: ReactNode;
};

type CardDescriptionProps = {
  className?: string;
  children: ReactNode;
};

type CardContentProps = {
  className?: string;
  children: ReactNode;
};

type CardFooterProps = {
  className?: string;
  children: ReactNode;
};

export function ShadcnCard({ className, children, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm text-gray-100 shadow-lg',
        'transition-all duration-300 ease-out',
        hover && 'hover:shadow-2xl hover:shadow-terminal-blue/10 hover:-translate-y-1 hover:border-gray-700',
        onClick && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function ShadcnCardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)}>
      {children}
    </div>
  );
}

export function ShadcnCardTitle({ className, children }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight font-mono',
        className
      )}
    >
      {children}
    </h3>
  );
}

export function ShadcnCardDescription({ className, children }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-400 font-mono', className)}>
      {children}
    </p>
  );
}

export function ShadcnCardContent({ className, children }: CardContentProps) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

export function ShadcnCardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)}>
      {children}
    </div>
  );
}
