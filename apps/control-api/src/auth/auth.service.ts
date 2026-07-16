import { Injectable } from '@nestjs/common';
import { verifyPassword, signAccessToken, signRefreshToken, verifyToken } from '@innflow/auth';
import { AuthenticationError, ValidationError } from '@innflow/domain';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';

const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_SECONDS = 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService,
    private readonly redis: RedisService,
  ) {}

  async login(email: string, password: string) {
    await this.enforceLoginRateLimit(email);

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER' | 'SYSTEM_ADMIN',
      tenantId: user.tenantId,
    };

    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken) as ReturnType<typeof verifyToken> & {
        type?: string;
      };
      const user = await this.users.requireById(decoded.sub);

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role as 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER' | 'SYSTEM_ADMIN',
        tenantId: user.tenantId,
      };

      return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
      };
    } catch {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.users.requireById(userId);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant
        ? { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug }
        : null,
    };
  }

  private async enforceLoginRateLimit(email: string): Promise<void> {
    const key = `login:rate:${email.toLowerCase()}`;
    const count = await this.redis.getClient().incr(key);
    if (count === 1) {
      await this.redis.getClient().expire(key, LOGIN_RATE_WINDOW_SECONDS);
    }
    if (count > LOGIN_RATE_LIMIT) {
      throw new ValidationError('Too many login attempts. Please try again later.', {
        retryAfterSeconds: LOGIN_RATE_WINDOW_SECONDS,
      });
    }
  }
}
