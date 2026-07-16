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
import { formatRelativeTime, useAsyncData } from '@/lib/hooks';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();

  const fetchRequest = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.getRequest(accessToken, id);
  }, [accessToken, id]);

  const { data, loading, error } = useAsyncData(fetchRequest, [accessToken, id]);

  return (
    <DashboardShell
      title="Request Details"
      subtitle={id}
      actions={
        data?.workflowExecutionId ? (
          <Link
            href={`/workflows/${data.workflowExecutionId}`}
            className="text-sm text-ops-accent hover:underline"
          >
            View Workflow →
          </Link>
        ) : undefined
      }
    >
      {loading && !data ? (
        <LoadingSpinner fullPage label="Loading request…" />
      ) : error ? (
        <EmptyState title="Request not found" description={error} />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Request">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={data.status} category="request" />
                  {data.requestType && (
                    <Badge variant="info">{data.requestType.replace(/_/g, ' ')}</Badge>
                  )}
                  <Badge>{data.priority}</Badge>
                  <Badge variant="default">{data.channel}</Badge>
                </div>
                <p className="rounded-md bg-ops-elevated p-4 text-sm leading-relaxed text-slate-200">
                  {data.rawText}
                </p>
                {data.normalizedText && data.normalizedText !== data.rawText && (
                  <p className="text-xs text-ops-muted">Normalized: {data.normalizedText}</p>
                )}
              </div>
            </Card>

            <Card title="Workflow Timeline">
              <TimelineList events={data.timeline} />
            </Card>

            <Card title="Agent Output" description={`${data.agentRuns.length} agent runs`}>
              {data.agentRuns.length === 0 ? (
                <EmptyState title="No agent runs yet" className="border-0 bg-transparent py-6" />
              ) : (
                <div className="space-y-4">
                  {data.agentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-md border border-ops-border bg-ops-elevated p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{run.agentType}</span>
                        <StatusBadge status={run.status} category="agent" />
                        <span className="font-mono text-xs text-ops-muted">
                          {run.provider}/{run.model}
                        </span>
                      </div>
                      {run.errorMessage ? (
                        <p className="text-xs text-red-400">{run.errorMessage}</p>
                      ) : run.outputJson ? (
                        <pre className="max-h-48 overflow-auto rounded bg-ops-bg p-3 font-mono text-xs text-slate-300">
                          {JSON.stringify(run.outputJson, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-xs text-ops-muted">No output</p>
                      )}
                      <p className="mt-2 text-xs text-ops-muted">
                        {run.tokenInput + run.tokenOutput} tokens · ${run.estimatedCostUsd.toFixed(4)} ·{' '}
                        {run.latencyMs}ms · {formatRelativeTime(run.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Guest Info">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ops-muted">Guest</dt>
                  <dd>{data.guestName ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ops-muted">Room</dt>
                  <dd className="font-mono">{data.roomNumber ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ops-muted">Reservation</dt>
                  <dd className="font-mono text-xs">{data.reservationId ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ops-muted">Created</dt>
                  <dd className="text-xs">{formatRelativeTime(data.createdAt)}</dd>
                </div>
              </dl>
            </Card>

            <Card title="Screenshots & Artifacts">
              {data.artifacts.length === 0 ? (
                <EmptyState
                  title="No artifacts"
                  description="Execution screenshots will appear here"
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                <div className="space-y-3">
                  {data.artifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-md border border-ops-border p-3">
                      <p className="text-xs font-medium text-slate-300">{artifact.artifactType}</p>
                      {artifact.url && artifact.contentType.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artifact.url}
                          alt={artifact.artifactType}
                          className="mt-2 max-h-48 rounded border border-ops-border object-contain"
                        />
                      ) : (
                        <p className="mt-1 font-mono text-xs text-ops-muted">{artifact.storageKey}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
