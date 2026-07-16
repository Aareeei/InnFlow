import { NextResponse } from 'next/server';
import { PMS_SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ message: 'Signed out successfully' });
  response.cookies.set(PMS_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
