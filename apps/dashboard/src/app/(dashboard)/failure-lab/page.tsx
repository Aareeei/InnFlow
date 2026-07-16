'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, EmptyState, LoadingSpinner } from '@innflow/ui';
import type { FailureInjectionConfig } from '@innflow/domain';
import { DashboardShell } from '@/components/DashboardShell';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const TOGGLE_FIELDS: Array<{ key: keyof FailureInjectionConfig; label: string; group: string }> = [
  { key: 'pmsMaintenanceMode', label: 'PMS Maintenance Mode', group: 'PMS' },
  { key: 'pmsFailNext', label: 'PMS Fail Next Request', group: 'PMS' },
  { key: 'browserCrashBeforeAction', label: 'Browser Crash Before Action', group: 'Browser' },
  { key: 'browserCrashAfterAction', label: 'Browser Crash After Action', group: 'Browser' },
  { key: 'browserSelectorTimeout', label: 'Browser Selector Timeout', group: 'Browser' },
  { key: 'aiProviderTimeout', label: 'AI Provider Timeout', group: 'AI' },
  { key: 'aiProviderMalformedResponse', label: 'AI Malformed Response', group: 'AI' },
  { key: 'verificationMismatch', label: 'Verification Mismatch', group: 'Verification' },
  { key: 'redisUnavailable', label: 'Redis Unavailable', group: 'Infrastructure' },
  { key: 'approvalTimeout', label: 'Approval Timeout', group: 'Workflow' },
  { key: 'slowBrowserActivity', label: 'Slow Browser Activity', group: 'Browser' },
  { key: 'partialFailureMultiAction', label: 'Partial Multi-Action Failure', group: 'Workflow' },
];

const NUMERIC_FIELDS: Array<{ key: keyof FailureInjectionConfig; label: string; min: number; max: number; step: number }> = [
  { key: 'pmsLatencyMs', label: 'PMS Latency (ms)', min: 0, max: 30000, step: 100 },
  { key: 'pmsErrorRate', label: 'PMS Error Rate', min: 0, max: 1, step: 0.05 },
];

export default function FailureLabPage() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<FailureInjectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (user && user.role !== 'SYSTEM_ADMIN') {
      router.replace('/');
    }
  }, [user, router]);

  const loadConfig = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFailureInjectionConfig(accessToken);
      setConfig(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  async function handleSave() {
    if (!accessToken || !config) return;
    setSaving(true);
    try {
      const updated = await api.updateFailureInjectionConfig(accessToken, config);
      setConfig(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function updateToggle(key: keyof FailureInjectionConfig, value: boolean) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateNumeric(key: keyof FailureInjectionConfig, value: number) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const groups = [...new Set(TOGGLE_FIELDS.map((f) => f.group))];

  return (
    <DashboardShell
      title="Failure Lab"
      subtitle={
        isSystemAdmin
          ? 'System-wide failure injection (SYSTEM_ADMIN)'
          : 'Tenant-scoped failure injection'
      }
      actions={
        <Button onClick={() => void handleSave()} loading={saving} disabled={!config}>
          Save Configuration
        </Button>
      }
    >
      {loading ? (
        <LoadingSpinner fullPage label="Loading failure lab…" />
      ) : error ? (
        <EmptyState title="Failed to load configuration" description={error} />
      ) : config ? (
        <div className="space-y-6">
          {!isSystemAdmin && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Tenant-scoped injection only. System-wide controls require SYSTEM_ADMIN role.
            </div>
          )}

          {groups.map((group) => (
            <Card key={group} title={group} description="Toggle failure scenarios">
              <div className="grid gap-3 sm:grid-cols-2">
                {TOGGLE_FIELDS.filter((f) => f.group === group).map((field) => (
                  <label
                    key={field.key}
                    className="flex cursor-pointer items-center justify-between rounded-md border border-ops-border bg-ops-elevated px-4 py-3"
                  >
                    <span className="text-sm text-slate-200">{field.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(config[field.key])}
                      onChange={(e) => updateToggle(field.key, e.target.checked)}
                      className="h-4 w-4 rounded border-ops-border bg-ops-bg text-ops-accent focus:ring-ops-accent"
                    />
                  </label>
                ))}
              </div>
            </Card>
          ))}

          <Card title="Numeric Parameters">
            <div className="grid gap-4 sm:grid-cols-2">
              {NUMERIC_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-ops-muted">{field.label}</label>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={Number(config[field.key])}
                    onChange={(e) => updateNumeric(field.key, Number(e.target.value))}
                    className="w-full rounded-md border border-ops-border bg-ops-elevated px-3 py-2 font-mono text-sm text-slate-100 focus:border-ops-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
