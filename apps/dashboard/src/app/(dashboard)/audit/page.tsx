'use client';

import { useCallback } from 'react';
import {
  Card,
  EmptyState,
  LoadingSpinner,
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

export default function AuditLogPage() {
  const { accessToken } = useAuth();

  const fetchAudit = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.listAuditEvents(accessToken, { pageSize: 100 });
  }, [accessToken]);

  const { data, loading, error } = useAsyncData(fetchAudit, [accessToken]);

  return (
    <DashboardShell title="Audit Log" subtitle="Immutable control plane event history">
      <Card padding="none">
        {loading && !data ? (
          <LoadingSpinner fullPage label="Loading audit log…" />
        ) : error ? (
          <EmptyState title="Failed to load audit log" description={error} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Trace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableEmpty colSpan={5} message="No audit events" />
              ) : (
                data.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap text-xs text-ops-muted">
                      {formatRelativeTime(event.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs">{event.actorType}</p>
                        {event.actorId && (
                          <p className="font-mono text-[10px] text-ops-muted">
                            {truncateId(event.actorId, 12)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{event.action}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs text-ops-muted">{event.resourceType}</p>
                        <p className="font-mono text-[10px]">{truncateId(event.resourceId, 12)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-ops-muted">
                      {event.traceId ? truncateId(event.traceId, 12) : '—'}
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
