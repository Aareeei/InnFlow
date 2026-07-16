'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Header,
  Sidebar,
  type NavItem,
} from '@innflow/ui';
import { useAuth } from '@/lib/auth-context';
import { useEventStream } from '@/lib/sse';
import {
  canAccessFailureLab,
  canManageSettings,
  formatRole,
  hasPermission,
} from '@/lib/roles';

const navIcons = {
  overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  requests: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  agents: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  approvals: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  failures: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  lab: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  health: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  audit: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

function buildNavItems(role: NonNullable<ReturnType<typeof useAuth>['user']>['role']): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Overview', icon: navIcons.overview },
    { href: '/requests', label: 'Guest Requests', icon: navIcons.requests },
    { href: '/agent-runs', label: 'Agent Runs', icon: navIcons.agents },
  ];

  if (hasPermission(role, 'approvals:resolve')) {
    items.push({ href: '/approvals', label: 'Human Approvals', icon: navIcons.approvals });
  }

  if (hasPermission(role, 'failures:requeue') || hasPermission(role, 'failures:resolve')) {
    items.push({ href: '/failures', label: 'Failure Queue', icon: navIcons.failures });
  }

  if (canAccessFailureLab(role) && role === 'SYSTEM_ADMIN') {
    items.push({ href: '/failure-lab', label: 'Failure Lab', icon: navIcons.lab });
  }

  if (hasPermission(role, 'system:health')) {
    items.push({ href: '/health', label: 'System Health', icon: navIcons.health });
  }

  if (hasPermission(role, 'audit:read')) {
    items.push({ href: '/audit', label: 'Audit Log', icon: navIcons.audit });
  }

  if (canManageSettings(role)) {
    items.push({ href: '/settings', label: 'Tenant Settings', icon: navIcons.settings });
  }

  return items;
}

export type DashboardShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  live?: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  actions,
  live,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const { connected } = useEventStream({
    token: accessToken,
    enabled: !!accessToken,
  });

  if (!user) return null;

  const navItems = buildNavItems(user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-ops-bg ops-grid-bg">
      <Sidebar
        items={navItems}
        currentPath={pathname}
        onNavigate={(href) => router.push(href)}
        footer={
          <div className="space-y-3">
            <div className="rounded-md bg-ops-elevated px-3 py-2">
              <p className="truncate text-xs font-medium text-slate-200">{user.email}</p>
              <Badge variant="accent" className="mt-1">
                {formatRole(user.role)}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={logout}>
              Sign out
            </Button>
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          actions={actions}
          live={live ?? connected}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
