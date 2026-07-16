import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export type KpiCardProps = {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
};

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  neutral: 'text-ops-muted',
};

export function KpiCard({
  label,
  value,
  change,
  trend = 'neutral',
  icon,
  loading,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ops-border bg-ops-surface p-5 shadow-ops',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-ops-muted">{label}</p>
        {icon && <div className="text-ops-accent">{icon}</div>}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-ops-elevated" />
      ) : (
        <p className="mt-2 font-mono text-3xl font-semibold text-slate-50">{value}</p>
      )}
      {change && !loading && (
        <p className={cn('mt-1 text-xs', trendColors[trend])}>{change}</p>
      )}
    </div>
  );
}
