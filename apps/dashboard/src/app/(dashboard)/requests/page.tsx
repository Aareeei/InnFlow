'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Card,
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
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime, truncateId, useAsyncData } from '@/lib/hooks';
import { useEventStream } from '@/lib/sse';

export default function RequestsPage() {
  const { accessToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.listRequests(accessToken, { status: statusFilter || undefined, pageSize: 50 });
  }, [accessToken, statusFilter]);

  const { data, loading, error, refresh } = useAsyncData(fetchRequests, [accessToken, statusFilter]);

  useEventStream({
    token: accessToken,
    onEvent: (e) => {
      if (e.resourceType === 'guest_request') void refresh();
    },
  });

  return (
    <DashboardShell title="Guest Requests" subtitle="All inbound guest service requests">
      <div className="mb-4 flex gap-2">
        {['', 'EXECUTING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'ESCALATED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-ops-accent/20 text-ops-accent'
                : 'bg-ops-elevated text-ops-muted hover:text-slate-200'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      <Card padding="none">
        {loading && !data ? (
          <LoadingSpinner fullPage label="Loading requests…" />
        ) : error ? (
          <EmptyState title="Failed to load requests" description={error} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableEmpty colSpan={7} message="No guest requests found" />
              ) : (
                data.data.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Link
                        href={`/requests/${req.id}`}
                        className="font-mono text-xs text-ops-accent hover:underline"
                      >
                        {truncateId(req.id)}
                      </Link>
                    </TableCell>
                    <TableCell>{req.guestName ?? '—'}</TableCell>
                    <TableCell className="font-mono">{req.roomNumber ?? '—'}</TableCell>
                    <TableCell>{req.requestType?.replace(/_/g, ' ') ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} category="request" />
                    </TableCell>
                    <TableCell>{req.channel}</TableCell>
                    <TableCell className="text-xs text-ops-muted">
                      {formatRelativeTime(req.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </DashboardShell>
  );
}
