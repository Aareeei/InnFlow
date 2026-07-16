import { sign, verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { loadConfig } from '@innflow/config';
import { AuthenticationError } from '@innflow/domain';

export const PMS_SESSION_COOKIE = 'pms_session';

export type PmsSession = {
  pmsUserId: string;
  hotelId: string;
  username: string;
  role: string;
};

function getSecret(): string {
  return loadConfig().JWT_SECRET;
}

export function signPmsSession(session: PmsSession): string {
  return sign(session, getSecret(), { expiresIn: '12h' });
}

export function verifyPmsSession(token: string): PmsSession {
  const decoded = verify(token, getSecret()) as PmsSession;
  return decoded;
}

export async function getSessionFromCookies(): Promise<PmsSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PMS_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    return verifyPmsSession(token);
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): PmsSession | null {
  const token = request.cookies.get(PMS_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    return verifyPmsSession(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<PmsSession> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AuthenticationError('PMS session required');
  }
  return session;
}

export function requireRequestSession(request: NextRequest): PmsSession {
  const session = getSessionFromRequest(request);
  if (!session) {
    throw new AuthenticationError('PMS session required');
  }
  return session;
}
