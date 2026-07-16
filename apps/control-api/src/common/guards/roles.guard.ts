import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@innflow/auth';
import { AuthorizationError } from '@innflow/domain';
import { ROLES_KEY } from '../decorators';
import type { AuthUser } from '../types';
import { AUTH_USER_KEY } from '../types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ [AUTH_USER_KEY]: AuthUser }>();
    const user = request[AUTH_USER_KEY];
    if (!user) {
      throw new AuthorizationError();
    }

    const allowed = requiredPermissions.some((permission) => hasPermission(user.role, permission));
    if (!allowed) {
      throw new AuthorizationError();
    }

    return true;
  }
}
