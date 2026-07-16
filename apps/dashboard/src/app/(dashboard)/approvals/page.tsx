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

export default function ApprovalsPage() {
  const { accessToken } = useAuth();
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    approved: boolean;
  } | null>(null);
  const [resolving, setResolving] = useState(false);

  const fetchApprovals = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.listApprovals(accessToken, { status: 'PENDING' });
  }, [accessToken]);

  const { data, loading, error, refresh } = useAsyncData(fetchApprovals, [accessToken]);

  useEventStream({
    token: accessToken,
    onEvent: (e) => {
      if (e.resourceType === 'human_approval') void refresh();
    },
  });

  async function handleResolve() {
    if (!pendingAction || !accessToken) return;
    setResolving(true);
    try {
      await api.resolveApproval(
        accessToken,
        pendingAction.id,
        pendingAction.approved,
      );
      setPendingAction(null);
      await refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to resolve');
    } finally {
      setResolving(false);
    }
  }

  return (
    <DashboardShell title="Human Approvals" subtitle="Pending operator decisions">
      <Card padding="none">
        {loading && !data ? (
          <LoadingSpinner fullPage label="Loading approvals…" />
        ) : error ? (
          <EmptyState title="Failed to load approvals" description={error} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableEmpty colSpan={7} message="No pending approvals" />
              ) : (
                data.data.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-medium">{approval.actionType}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs">{approval.reason}</TableCell>
                    <TableCell>{approval.guestName ?? '—'}</TableCell>
                    <TableCell>
                      <Link
                        href={`/requests/${approval.guestRequestId}`}
                        className="font-mono text-xs text-ops-accent hover:underline"
                      >
                        {truncateId(approval.guestRequestId)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={approval.status} category="approval" />
                    </TableCell>
                    <TableCell className="text-xs text-ops-muted">
                      {formatRelativeTime(approval.requestedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            setPendingAction({ id: approval.id, approved: true })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setPendingAction({ id: approval.id, approved: false })
                          }
                        >
                          Reject
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
        open={!!pendingAction}
        title={pendingAction?.approved ? 'Approve action' : 'Reject action'}
        description="This will signal the workflow to continue or cancel the pending action."
        confirmLabel={pendingAction?.approved ? 'Approve' : 'Reject'}
        variant={pendingAction?.approved ? 'primary' : 'danger'}
        loading={resolving}
        onConfirm={() => void handleResolve()}
        onCancel={() => setPendingAction(null)}
      />
    </DashboardShell>
  );
}
