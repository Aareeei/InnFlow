'use client';

import { useCallback } from 'react';
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

export default function AgentRunsPage() {
  const { accessToken } = useAuth();

  const fetchRuns = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.listAgentRuns(accessToken, { pageSize: 50 });
  }, [accessToken]);

  const { data, loading, error } = useAsyncData(fetchRuns, [accessToken]);

  return (
    <DashboardShell title="Agent Runs" subtitle="AI agent execution history">
      <Card padding="none">
        {loading && !data ? (
          <LoadingSpinner fullPage label="Loading agent runs…" />
        ) : error ? (
          <EmptyState title="Failed to load agent runs" description={error} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data.length ? (
                <TableEmpty colSpan={8} message="No agent runs found" />
              ) : (
                data.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.agentType}</TableCell>
                    <TableCell>
                      <Link
                        href={`/requests/${run.guestRequestId}`}
                        className="font-mono text-xs text-ops-accent hover:underline"
                      >
                        {truncateId(run.guestRequestId)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {run.provider}/{run.model}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} category="agent" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {run.tokenInput + run.tokenOutput}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      ${run.estimatedCostUsd.toFixed(4)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{run.latencyMs}ms</TableCell>
                    <TableCell className="text-xs text-ops-muted">
                      {formatRelativeTime(run.createdAt)}
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
