'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button type="button" className="pms-button w-full" data-testid="nav-logout" onClick={handleLogout}>
      Sign Out
    </button>
  );
}
