'use client';

import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Badge } from './Badge';

export type HeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  live?: boolean;
  className?: string;
};

export function Header({ title, subtitle, actions, live, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center justify-between border-b border-ops-border bg-ops-surface/80 px-6 py-4 backdrop-blur-sm',
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
          {live && (
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </Badge>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-sm text-ops-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
