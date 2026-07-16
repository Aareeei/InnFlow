'use client';

import { useCallback } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  LoadingSpinner,
  StatusBadge,
} from '@innflow/ui';
import { DashboardShell } from '@/components/DashboardShell';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useAsyncData } from '@/lib/hooks';

const serviceStatusVariant = (status: string) => {
  if (status === 'up') return 'success' as const;
  if (status === 'degraded') return 'warning' as const;
  return 'danger' as const;
};

export default function SystemHealthPage() {
  const { accessToken } = useAuth();

  const fetchHealth = useCallback(async () => {
    if (!accessToken) throw new Error('Not authenticated');
    return api.getSystemHealth(accessToken);
  }, [accessToken]);

  const { data, loading, error, refresh } = useAsyncData(fetchHealth, [accessToken]);

  return (
    <DashboardShell
      title="System Health"
      subtitle="Platform service status and circuit breakers"
      actions={
        <button
          onClick={() => void refresh()}
          className="text-sm text-ops-accent hover:underline"
        >
          Refresh
        </button>
      }
    >
      {loading && !data ? (
        <LoadingSpinner fullPage label="Checking system health…" />
      ) : error ? (
        <EmptyState title="Failed to load health data" description={error} />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-ops-muted">Overall:</span>
            <StatusBadge
              status={data.status.toUpperCase()}
              category="generic"
            />
          </div>

          <Card title="Services">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.services.map((service) => (
                <div
                  key={service.name}
                  className="rounded-md border border-ops-border bg-ops-elevated p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{service.name}</span>
                    <Badge variant={serviceStatusVariant(service.status)}>
                      {service.status.toUpperCase()}
                    </Badge>
                  </div>
                  {service.latencyMs != null && (
                    <p className="mt-2 font-mono text-xs text-ops-muted">
                      {service.latencyMs}ms latency
                    </p>
                  )}
                  {service.message && (
                    <p className="mt-1 text-xs text-ops-muted">{service.message}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Circuit Breakers">
            {data.circuits.length === 0 ? (
              <p className="text-sm text-ops-muted">No circuit breakers registered</p>
            ) : (
              <div className="space-y-2">
                {data.circuits.map((circuit) => (
                  <div
                    key={circuit.name}
                    className="flex items-center justify-between rounded-md border border-ops-border px-4 py-3"
                  >
                    <span className="text-sm text-slate-200">{circuit.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-ops-muted">
                        failures: {circuit.failureCount}
                      </span>
                      <StatusBadge status={circuit.state} category="generic" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
