'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@innflow/ui';
import { DashboardShell } from '@/components/DashboardShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime, truncateId, useAsyncData } from '@/lib/hooks';
import { useEventStream } from '@/lib/sse';

export default function FailuresPage() {
  const { accessToken } = useAuth();
  const [action, setAction] = useState<{ id: string; type: 'requeue' | 'resolve' } | null>(null);
  const [acting, setActing] = useState(false);

  const fetchFailures = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.listFailures(accessToken, { status: 'OPEN' });
  }, [accessToken]);

  const { data, loading, error, refresh } = useAsyncData(fetchFailures, [accessToken]);

  useEventStream({
    token: accessToken,
    onEvent: (e) => {
      if (e.resourceType === 'failure_queue') void refresh();
    },
  });

  async function handleAction() {
    if (!action || !accessToken) return;
    setActing(true);
    try {
      if (action.type === 'requeue') {
        await api.requeueFailure(accessToken, action.id);
      } else {
        await api.resolveFailure(accessToken, action.id);
      }
      setAction(null);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  }

  return (
    <DashboardShell title="Failure Queue" subtitle="Open failures requiring attention">
      <Card padding="none">
        {loading && !data ? (
          <LoadingSpinner fullPage label="Loading failures…" />
        ) : error ? (
          <EmptyState title="Failed to load failure queue" description={error} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Last Failed</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableEmpty colSpan={7} message="No open failures" />
              ) : (
                data.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm">{item.failureType}</p>
                        <p className="font-mono text-xs text-ops-muted">{item.errorCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-red-300">
                      {item.errorMessage}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/requests/${item.guestRequestId}`}
                        className="font-mono text-xs text-ops-accent hover:underline"
                      >
                        {truncateId(item.guestRequestId)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} category="failure" />
                    </TableCell>
                    <TableCell className="font-mono">{item.retryCount}</TableCell>
                    <TableCell className="text-xs text-ops-muted">
                      {formatRelativeTime(item.lastFailedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAction({ id: item.id, type: 'requeue' })}
                        >
                          Requeue
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAction({ id: item.id, type: 'resolve' })}
                        >
                          Resolve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!action}
        title={action?.type === 'requeue' ? 'Requeue failure' : 'Resolve failure'}
        description={
          action?.type === 'requeue'
            ? 'This will re-enqueue the failed workflow for retry.'
            : 'Mark this failure as resolved without retry.'
        }
        confirmLabel={action?.type === 'requeue' ? 'Requeue' : 'Resolve'}
        variant={action?.type === 'requeue' ? 'primary' : 'danger'}
        loading={acting}
        onConfirm={() => void handleAction()}
        onCancel={() => setAction(null)}
      />
    </DashboardShell>
  );
}
