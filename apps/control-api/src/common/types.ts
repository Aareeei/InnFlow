import type { UserRole } from '@innflow/domain';

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
}

export const AUTH_USER_KEY = 'authUser';
export const TENANT_ID_KEY = 'tenantId';
