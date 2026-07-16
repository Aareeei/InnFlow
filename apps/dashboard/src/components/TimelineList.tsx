'use client';

import { StatusBadge } from '@innflow/ui';
import { formatRelativeTime } from '@/lib/hooks';

export function TimelineList({
  events,
}: {
  events: Array<{
    id: string;
    stepName: string;
    stepType: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    errorMessage?: string;
  }>;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-ops-muted">No timeline events yet.</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-ops-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative pb-6 last:pb-0">
          <span
            className={`absolute -left-[25px] flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-ops-surface ${
              event.status === 'COMPLETED'
                ? 'bg-emerald-500'
                : event.status === 'FAILED'
                  ? 'bg-red-500'
                  : event.status === 'RUNNING'
                    ? 'bg-cyan-500 animate-pulse'
                    : 'bg-slate-600'
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{event.stepName}</span>
            <StatusBadge status={event.status} category="generic" />
            <span className="font-mono text-xs text-ops-muted">{event.stepType}</span>
          </div>
          {event.errorMessage && (
            <p className="mt-1 text-xs text-red-400">{event.errorMessage}</p>
          )}
          <p className="mt-1 text-xs text-ops-muted">
            {event.startedAt ? formatRelativeTime(event.startedAt) : 'Pending'}
            {event.durationMs != null && ` · ${event.durationMs}ms`}
          </p>
        </li>
      ))}
    </ol>
  );
}
