'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, LoadingSpinner } from '@innflow/ui';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ops-bg ops-grid-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ops-bg ops-grid-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-ops-accent/20 text-ops-accent">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">InnFlow</h1>
          <p className="mt-1 text-sm text-ops-muted">Operations Control Plane</p>
        </div>

        <Card title="Sign in" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-ops-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-ops-border bg-ops-elevated px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-ops-accent focus:outline-none focus:ring-1 focus:ring-ops-accent"
                placeholder="operator@hotel.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-ops-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ops-border bg-ops-elevated px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-ops-accent focus:outline-none focus:ring-1 focus:ring-ops-accent"
              />
            </div>
            <Button type="submit" className="w-full" loading={submitting}>
              Sign in
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-ops-muted">
          API: {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
        </p>
      </div>
    </div>
  );
}
