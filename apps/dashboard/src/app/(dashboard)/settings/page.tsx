'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, EmptyState, LoadingSpinner } from '@innflow/ui';
import { DashboardShell } from '@/components/DashboardShell';
import { api, ApiError } from '@/lib/api';
import type { TenantSettings } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { canManageSettings } from '@/lib/roles';

export default function SettingsPage() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !canManageSettings(user.role)) {
      router.replace('/');
    }
  }, [user, router]);

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenantSettings(accessToken);
      setSettings(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !settings) return;
    setSaving(true);
    try {
      const updated = await api.updateTenantSettings(accessToken, {
        name: settings.name,
        timezone: settings.timezone,
      });
      setSettings(updated);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Tenant Settings" subtitle="Organization configuration">
      {loading ? (
        <LoadingSpinner fullPage label="Loading settings…" />
      ) : error ? (
        <EmptyState title="Failed to load settings" description={error} />
      ) : settings ? (
        <Card title="General" padding="lg">
          <form onSubmit={(e) => void handleSave(e)} className="max-w-lg space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ops-muted">
                Tenant Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full rounded-md border border-ops-border bg-ops-elevated px-3 py-2 text-sm text-slate-100 focus:border-ops-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ops-muted">Slug</label>
              <input
                type="text"
                value={settings.slug}
                disabled
                className="w-full rounded-md border border-ops-border bg-ops-bg px-3 py-2 font-mono text-sm text-ops-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ops-muted">Timezone</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full rounded-md border border-ops-border bg-ops-elevated px-3 py-2 text-sm text-slate-100 focus:border-ops-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ops-muted">Tenant ID</label>
              <input
                type="text"
                value={settings.id}
                disabled
                className="w-full rounded-md border border-ops-border bg-ops-bg px-3 py-2 font-mono text-xs text-ops-muted"
              />
            </div>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </form>
        </Card>
      ) : null}
    </DashboardShell>
  );
}
