import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { verifyToken } from '@innflow/auth';
import { AuthenticationError } from '@innflow/domain';
import type { AuthUser } from '../types';
import { AUTH_USER_KEY } from '../types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      [AUTH_USER_KEY]?: AuthUser;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = header.slice('Bearer '.length);
    try {
      const payload = verifyToken(token);
      request[AUTH_USER_KEY] = payload;
      return true;
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }
  }
}
