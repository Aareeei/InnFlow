import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantIsolationError, ValidationError } from '@innflow/domain';
import type { AuthUser } from '../types';
import { AUTH_USER_KEY, TENANT_ID_KEY } from '../types';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      [AUTH_USER_KEY]?: AuthUser;
      [TENANT_ID_KEY]?: string;
      params: Record<string, string>;
      query: Record<string, string | undefined>;
      headers: Record<string, string | undefined>;
    }>();

    const user = request[AUTH_USER_KEY];
    if (!user) {
      throw new TenantIsolationError();
    }

    if (user.role === 'SYSTEM_ADMIN') {
      const tenantId =
        request.query.tenantId ??
        request.headers['x-tenant-id'] ??
        request.params.tenantId;
      if (tenantId) {
        request[TENANT_ID_KEY] = tenantId;
      }
      return true;
    }

    if (!user.tenantId) {
      throw new TenantIsolationError('User is not associated with a tenant');
    }

    request[TENANT_ID_KEY] = user.tenantId;
    return true;
  }
}

export function requireTenantId(request: {
  [TENANT_ID_KEY]?: string;
  [AUTH_USER_KEY]?: AuthUser;
}): string {
  if (request[TENANT_ID_KEY]) {
    return request[TENANT_ID_KEY];
  }

  const user = request[AUTH_USER_KEY];
  if (user?.role === 'SYSTEM_ADMIN') {
    throw new ValidationError('tenantId query parameter or X-Tenant-Id header is required');
  }

  if (user?.tenantId) {
    return user.tenantId;
  }

  throw new TenantIsolationError();
}
