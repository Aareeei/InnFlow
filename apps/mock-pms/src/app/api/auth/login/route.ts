import { NextResponse } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, parseJsonBody } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { verifyPmsPassword } from '@/lib/password';
import { PMS_SESSION_COOKIE, signPmsSession } from '@/lib/session';

type LoginBody = {
  username?: string;
  password?: string;
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = parseJsonBody<LoginBody>(await request.json());
    const username = body.username?.trim();
    const password = body.password;

    if (!username || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } },
        { status: 400 },
      );
    }

    const user = await prisma.pmsUser.findFirst({
      where: { username },
      include: { hotel: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid credentials' } },
        { status: 401 },
      );
    }

    await applyFailureInjection(user.hotelId);

    const valid = await verifyPmsPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid credentials' } },
        { status: 401 },
      );
    }

    const token = signPmsSession({
      pmsUserId: user.id,
      hotelId: user.hotelId,
      username: user.username,
      role: user.role,
    });

    const response = jsonOk({
      message: `Welcome back, ${user.username}`,
      hotel: user.hotel,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set(PMS_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
