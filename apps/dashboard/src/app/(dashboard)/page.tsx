'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  EmptyState,
  KpiCard,
  LoadingSpinner,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@innflow/ui';
import { DashboardShell } from '@/components/DashboardShell';
import { RequestVolumeChart } from '@/components/charts/RequestVolumeChart';
import { StatusDistributionChart } from '@/components/charts/StatusDistributionChart';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime, useAsyncData } from '@/lib/hooks';
import { useEventStream } from '@/lib/sse';

export default function OverviewPage() {
  const { accessToken } = useAuth();

  const fetchOverview = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.getOverview(accessToken);
  }, [accessToken]);

  const { data, loading, error, refresh } = useAsyncData(fetchOverview, [accessToken]);

  useEventStream({
    token: accessToken,
    onEvent: () => void refresh(),
  });

  return (
    <DashboardShell title="Overview" subtitle="Real-time operations metrics" live>
      {loading && !data ? (
        <LoadingSpinner fullPage label="Loading metrics…" />
      ) : error ? (
        <EmptyState
          title="Failed to load overview"
          description={error}
          action={
            <button
              onClick={() => void refresh()}
              className="text-sm text-ops-accent hover:underline"
            >
              Retry
            </button>
          }
        />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Active Requests" value={data.kpis.activeRequests} loading={loading} />
            <KpiCard label="Completed Today" value={data.kpis.completedToday} loading={loading} />
            <KpiCard label="Pending Approvals" value={data.kpis.pendingApprovals} loading={loading} />
            <KpiCard label="Open Failures" value={data.kpis.openFailures} loading={loading} />
            <KpiCard
              label="Avg Completion"
              value={`${Math.round(data.kpis.avgCompletionMs / 1000)}s`}
              loading={loading}
            />
            <KpiCard
              label="Success Rate"
              value={`${(data.kpis.successRate * 100).toFixed(1)}%`}
              loading={loading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Request Volume" description="Last 7 days">
              {data.requestVolume.length > 0 ? (
                <RequestVolumeChart data={data.requestVolume} />
              ) : (
                <EmptyState title="No volume data" className="border-0 bg-transparent py-8" />
              )}
            </Card>
            <Card title="Status Distribution" description="Current request states">
              {data.statusDistribution.length > 0 ? (
                <StatusDistributionChart data={data.statusDistribution} />
              ) : (
                <EmptyState title="No status data" className="border-0 bg-transparent py-8" />
              )}
            </Card>
          </div>

          <Card title="Recent Activity" description="Latest control plane events">
            {data.recentActivity.length === 0 ? (
              <EmptyState title="No recent activity" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <StatusBadge status={item.type} category="generic" />
                      </TableCell>
                      <TableCell>
                        {item.resourceId ? (
                          <Link
                            href={`/requests/${item.resourceId}`}
                            className="text-ops-accent hover:underline"
                          >
                            {item.message}
                          </Link>
                        ) : (
                          item.message
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-ops-muted">
                        {formatRelativeTime(item.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
