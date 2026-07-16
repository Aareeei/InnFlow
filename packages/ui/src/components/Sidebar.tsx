'use client';

import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
};

export type SidebarProps = {
  items: NavItem[];
  currentPath: string;
  footer?: ReactNode;
  brand?: ReactNode;
  className?: string;
  onNavigate?: (href: string) => void;
};

export function Sidebar({
  items,
  currentPath,
  footer,
  brand,
  className,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-60 shrink-0 flex-col border-r border-ops-border bg-ops-surface',
        className,
      )}
    >
      <div className="border-b border-ops-border px-5 py-4">
        {brand ?? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ops-accent/20 text-ops-accent">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-100">InnFlow</p>
              <p className="text-[10px] uppercase tracking-widest text-ops-muted">Control Plane</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === '/'
              ? currentPath === '/'
              : currentPath === item.href || currentPath.startsWith(`${item.href}/`);

          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(item.href);
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-ops-accent/10 text-ops-accent'
                  : 'text-slate-400 hover:bg-ops-elevated hover:text-slate-200',
              )}
            >
              {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="rounded-full bg-ops-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {footer && <div className="border-t border-ops-border p-3">{footer}</div>}
    </aside>
  );
}
