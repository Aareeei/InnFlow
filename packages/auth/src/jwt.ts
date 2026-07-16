import jwt, { type SignOptions } from 'jsonwebtoken';
import { loadConfig } from '@innflow/config';
import type { UserRole } from '@innflow/domain';

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
};

type RefreshTokenPayload = TokenPayload & {
  type: 'refresh';
};

function getJwtConfig(): {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
} {
  const config = loadConfig();
  return {
    secret: config.JWT_SECRET,
    accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  };
}

export function signAccessToken(payload: TokenPayload): string {
  const { secret, accessExpiresIn } = getJwtConfig();
  const options: SignOptions = { expiresIn: accessExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const { secret, refreshExpiresIn } = getJwtConfig();
  const refreshPayload: RefreshTokenPayload = { ...payload, type: 'refresh' };
  const options: SignOptions = { expiresIn: refreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(refreshPayload, secret, options);
}

export function verifyToken(token: string): TokenPayload {
  const { secret } = getJwtConfig();
  const decoded = jwt.verify(token, secret) as RefreshTokenPayload;
  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    tenantId: decoded.tenantId,
  };
}
