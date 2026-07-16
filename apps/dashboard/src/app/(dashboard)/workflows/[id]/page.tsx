'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Card,
  EmptyState,
  LoadingSpinner,
  StatusBadge,
} from '@innflow/ui';
import { DashboardShell } from '@/components/DashboardShell';
import { TimelineList } from '@/components/TimelineList';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDuration, formatRelativeTime, useAsyncData } from '@/lib/hooks';

export default function WorkflowTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();

  const fetchWorkflow = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.getWorkflow(accessToken, id);
  }, [accessToken, id]);

  const { data, loading, error } = useAsyncData(fetchWorkflow, [accessToken, id]);

  return (
    <DashboardShell
      title="Workflow Timeline"
      subtitle={data?.temporalWorkflowId ?? id}
      actions={
        data?.guestRequestId ? (
          <Link
            href={`/requests/${data.guestRequestId}`}
            className="text-sm text-ops-accent hover:underline"
          >
            View Request →
          </Link>
        ) : undefined
      }
    >
      {loading && !data ? (
        <LoadingSpinner fullPage label="Loading workflow…" />
      ) : error ? (
        <EmptyState title="Workflow not found" description={error} />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Execution Steps">
              <TimelineList events={data.steps} />
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Workflow Info">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ops-muted">Status</dt>
                  <dd>
                    <StatusBadge status={data.status} category="workflow" />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ops-muted">Started</dt>
                  <dd className="text-xs">{formatRelativeTime(data.startedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ops-muted">Duration</dt>
                  <dd className="font-mono">{formatDuration(data.totalDurationMs)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ops-muted">Retries</dt>
                  <dd className="font-mono">{data.retryCount}</dd>
                </div>
                {data.failureReason && (
                  <div>
                    <dt className="text-ops-muted">Failure</dt>
                    <dd className="mt-1 text-xs text-red-400">{data.failureReason}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card title="Temporal">
              <p className="break-all font-mono text-xs text-slate-400">{data.temporalWorkflowId}</p>
              {data.temporalRunId && (
                <p className="mt-2 break-all font-mono text-xs text-ops-muted">
                  Run: {data.temporalRunId}
                </p>
              )}
            </Card>

            <Card title="Artifacts" description={`${data.artifacts.length} items`}>
              {data.artifacts.length === 0 ? (
                <p className="text-sm text-ops-muted">No artifacts</p>
              ) : (
                <ul className="space-y-2">
                  {data.artifacts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-xs">
                      <Badge>{a.artifactType}</Badge>
                      <span className="font-mono text-ops-muted">{a.contentType}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
