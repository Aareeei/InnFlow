'use client';

import { useEffect, useState } from 'react';
import type { FailureInjectionConfig } from '@innflow/domain';
import { SuccessBanner } from '@/components/SuccessBanner';

const DEFAULT_CONFIG: FailureInjectionConfig = {
  pmsMaintenanceMode: false,
  pmsLatencyMs: 0,
  pmsErrorRate: 0,
  pmsFailNext: false,
  browserCrashBeforeAction: false,
  browserCrashAfterAction: false,
  browserSelectorTimeout: false,
  aiProviderTimeout: false,
  aiProviderMalformedResponse: false,
  verificationMismatch: false,
  redisUnavailable: false,
  approvalTimeout: false,
  slowBrowserActivity: false,
  partialFailureMultiAction: false,
};

const BOOLEAN_FIELDS: Array<{ key: keyof FailureInjectionConfig; label: string; testId: string }> = [
  { key: 'pmsMaintenanceMode', label: 'PMS Maintenance Mode', testId: 'failure-pms-maintenance-mode' },
  { key: 'pmsFailNext', label: 'Fail Next PMS Request', testId: 'failure-pms-fail-next' },
  { key: 'browserCrashBeforeAction', label: 'Browser Crash Before Action', testId: 'failure-browser-crash-before' },
  { key: 'browserCrashAfterAction', label: 'Browser Crash After Action', testId: 'failure-browser-crash-after' },
  { key: 'browserSelectorTimeout', label: 'Browser Selector Timeout', testId: 'failure-browser-selector-timeout' },
  { key: 'verificationMismatch', label: 'Verification Mismatch', testId: 'failure-verification-mismatch' },
  { key: 'slowBrowserActivity', label: 'Slow Browser Activity', testId: 'failure-slow-browser-activity' },
];

export default function FailureSettingsPage() {
  const [config, setConfig] = useState<FailureInjectionConfig>(DEFAULT_CONFIG);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch('/api/admin/failure-config')
      .then((response) => response.json())
      .then((payload: { data?: FailureInjectionConfig }) => {
        if (payload.data) {
          setConfig(payload.data);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/failure-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const body = (await response.json()) as { message?: string; error?: { message: string } };
      if (!response.ok) {
        setError(body.error?.message ?? 'Failed to save settings');
        return;
      }
      setSuccess(body.message ?? 'Failure injection settings saved successfully');
    } catch {
      setError('Unable to save failure settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Failure Injection Settings</div>

      <form
        className="space-y-3 border border-pms-border bg-pms-panel p-3"
        data-testid="failure-settings-form"
        onSubmit={handleSubmit}
      >
        <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />
        {error ? (
          <div className="border border-red-700 bg-red-100 px-3 py-2 text-sm" data-testid="error-message">
            {error}
          </div>
        ) : null}

        <label className="block text-sm">
          PMS Latency (ms)
          <input
            type="number"
            className="pms-input mt-1 w-full"
            data-testid="failure-pms-latency-ms"
            value={config.pmsLatencyMs}
            onChange={(event) =>
              setConfig((current) => ({ ...current, pmsLatencyMs: Number(event.target.value) }))
            }
          />
        </label>

        <label className="block text-sm">
          PMS Error Rate (0-1)
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className="pms-input mt-1 w-full"
            data-testid="failure-pms-error-rate"
            value={config.pmsErrorRate}
            onChange={(event) =>
              setConfig((current) => ({ ...current, pmsErrorRate: Number(event.target.value) }))
            }
          />
        </label>

        {BOOLEAN_FIELDS.map((field) => (
          <label key={field.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              data-testid={field.testId}
              checked={Boolean(config[field.key])}
              onChange={(event) =>
                setConfig((current) => ({ ...current, [field.key]: event.target.checked }))
              }
            />
            {field.label}
          </label>
        ))}

        <button type="submit" className="pms-button" data-testid="failure-settings-submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
