import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@innflow/auth';
import type { AuthUser } from '../types';
import { AUTH_USER_KEY } from '../types';

export const ROLES_KEY = 'permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(ROLES_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ [AUTH_USER_KEY]: AuthUser }>();
    return request[AUTH_USER_KEY];
  },
);

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    return request.headers['idempotency-key'];
  },
);
