import type { UserRole } from '@innflow/domain';
import { ROLE_PERMISSIONS, type Permission } from './roles.js';

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
