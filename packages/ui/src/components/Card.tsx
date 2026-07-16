import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  action?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  className,
  title,
  description,
  action,
  padding = 'md',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ops-border bg-ops-surface shadow-ops',
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-ops-border px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-ops-muted">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(paddingStyles[padding], title && padding !== 'none' && 'pt-0')}>
        {children}
      </div>
    </div>
  );
}
