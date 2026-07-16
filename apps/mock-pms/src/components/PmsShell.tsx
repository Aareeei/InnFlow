'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';

const NAV_ITEMS = [
  { href: '/reservations', label: 'Reservations', testId: 'nav-reservations' },
  { href: '/guests', label: 'Guests', testId: 'nav-guests' },
  { href: '/rooms', label: 'Rooms', testId: 'nav-rooms' },
  { href: '/housekeeping', label: 'Housekeeping', testId: 'nav-housekeeping' },
  { href: '/maintenance', label: 'Maintenance', testId: 'nav-maintenance' },
  { href: '/wake-up-calls', label: 'Wake-up Calls', testId: 'nav-wake-up-calls' },
  { href: '/restaurant-bookings', label: 'Restaurant', testId: 'nav-restaurant-bookings' },
  { href: '/administration', label: 'Administration', testId: 'nav-administration' },
  { href: '/failure-settings', label: 'Failure Settings', testId: 'nav-failure-settings' },
];

type PmsShellProps = {
  hotelName: string;
  username: string;
  children: React.ReactNode;
};

export function PmsShell({ hotelName, username, children }: PmsShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen p-3">
      <div className="pms-window mx-auto max-w-7xl">
        <div className="pms-titlebar" data-testid="pms-titlebar">
          <span>LegacyPMS v2.4 — {hotelName}</span>
          <span className="font-normal">Operator: {username}</span>
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-3 p-3">
          <aside className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={item.testId}
                  className={`pms-nav-link ${active ? 'pms-nav-link-active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <LogoutButton />
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
