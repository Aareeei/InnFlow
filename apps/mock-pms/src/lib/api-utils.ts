import { NextResponse } from 'next/server';
import { prisma } from '@innflow/database';
import { AuthenticationError, ValidationError } from '@innflow/domain';
import type { PmsSession } from './session';

export { requireRequestSession } from './session';

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 401 });
  }

  if (error instanceof ValidationError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 400 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unknown error' } }, { status: 500 });
}

export async function getHotelForSession(session: PmsSession) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: session.hotelId },
  });

  if (!hotel) {
    throw new ValidationError('Hotel not found for session');
  }

  return hotel;
}

export function parseJsonBody<T>(body: unknown): T {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }
  return body as T;
}
