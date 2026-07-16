'use client';

import { useState } from 'react';
import { SuccessBanner } from '@/components/SuccessBanner';

type ActionFormProps = {
  endpoint: string;
  method?: 'POST' | 'PATCH' | 'DELETE';
  testIdPrefix: string;
  submitLabel: string;
  successTemplate: string;
  fields: Array<{
    name: string;
    label: string;
    type?: string;
    testId: string;
    defaultValue?: string;
    required?: boolean;
  }>;
  hiddenFields?: Record<string, string>;
};

export function ActionForm({
  endpoint,
  method = 'POST',
  testIdPrefix,
  submitLabel,
  successTemplate,
  fields,
  hiddenFields = {},
}: ActionFormProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = { ...hiddenFields };

    for (const field of fields) {
      payload[field.name] = String(formData.get(field.name) ?? '');
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        message?: string;
        error?: { message: string };
        data?: Record<string, unknown>;
      };

      if (!response.ok) {
        setError(body.error?.message ?? 'Request failed');
        return;
      }

      setSuccess(body.message ?? successTemplate);
      event.currentTarget.reset();
    } catch {
      setError('Unable to reach PMS service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-3 border border-pms-border bg-pms-panel p-3"
      data-testid={`${testIdPrefix}-form`}
      onSubmit={handleSubmit}
    >
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />
      {error ? (
        <div className="border border-red-700 bg-red-100 px-3 py-2 text-sm" data-testid="error-message">
          {error}
        </div>
      ) : null}

      {fields.map((field) => (
        <label key={field.name} className="block text-sm">
          {field.label}
          <input
            name={field.name}
            type={field.type ?? 'text'}
            className="pms-input mt-1 w-full"
            data-testid={field.testId}
            defaultValue={field.defaultValue}
            required={field.required ?? true}
          />
        </label>
      ))}

      <button
        type="submit"
        className="pms-button"
        data-testid={`${testIdPrefix}-submit`}
        disabled={loading}
      >
        {loading ? 'Processing…' : submitLabel}
      </button>
    </form>
  );
}
