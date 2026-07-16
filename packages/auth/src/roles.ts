import type { UserRole } from '@innflow/domain';

export type Permission =
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

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
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
