import type { UserRole } from '@innflow/domain';

type Permission =
  | 'requests:read'
  | 'requests:write'
  | 'approvals:resolve'
  | 'workflows:retry'
  | 'escalations:resolve'
  | 'failures:requeue'
  | 'failures:resolve'
  | 'audit:read'
  | 'failure-injection:tenant'
  | 'failure-injection:system'
  | 'system:health'
  | 'tenants:read';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  TENANT_ADMIN: [
    'requests:read',
    'requests:write',
    'approvals:resolve',
    'workflows:retry',
    'escalations:resolve',
    'failures:requeue',
    'failures:resolve',
    'audit:read',
    'failure-injection:tenant',
  ],
  OPERATOR: [
    'requests:read',
    'approvals:resolve',
    'escalations:resolve',
    'failures:requeue',
    'failures:resolve',
    'audit:read',
  ],
  VIEWER: ['requests:read', 'audit:read'],
  SYSTEM_ADMIN: [
    'requests:read',
    'requests:write',
    'approvals:resolve',
    'workflows:retry',
    'escalations:resolve',
    'failures:requeue',
    'failures:resolve',
    'audit:read',
    'failure-injection:system',
    'system:health',
    'tenants:read',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessFailureLab(role: UserRole): boolean {
  return (
    hasPermission(role, 'failure-injection:tenant') ||
    hasPermission(role, 'failure-injection:system')
  );
}

export function canManageSettings(role: UserRole): boolean {
  return role === 'TENANT_ADMIN' || hasPermission(role, 'tenants:read');
}

export function formatRole(role: UserRole): string {
  return role.replace(/_/g, ' ');
}

export type { Permission };
