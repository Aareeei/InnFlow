'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SuccessBanner } from '@/components/SuccessBanner';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as {
        error?: { message: string };
        message?: string;
      };

      if (!response.ok) {
        setError(payload.error?.message ?? 'Login failed');
        return;
      }

      setSuccess(payload.message ?? 'Login successful');
      router.push('/reservations');
      router.refresh();
    } catch {
      setError('Unable to reach PMS login service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="pms-window w-full max-w-md">
        <div className="pms-titlebar" data-testid="login-titlebar">
          LegacyPMS Sign-In
        </div>
        <form className="space-y-3 p-4" onSubmit={handleSubmit} data-testid="login-form">
          <SuccessBanner message={success} />
          {error ? (
            <div className="border border-red-700 bg-red-100 px-3 py-2 text-sm text-red-900" data-testid="error-message">
              {error}
            </div>
          ) : null}

          <label className="block text-sm">
            Username
            <input
              className="pms-input mt-1 w-full"
              data-testid="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              className="pms-input mt-1 w-full"
              data-testid="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="pms-button w-full"
            data-testid="login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
