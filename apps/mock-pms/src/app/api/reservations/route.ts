import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const reservations = await prisma.reservation.findMany({
      where: { hotelId: session.hotelId },
      include: { guest: true, room: true },
      orderBy: { checkIn: 'desc' },
    });

    return jsonOk({ data: reservations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = (await request.json()) as {
      guestId?: string;
      roomId?: string;
      confirmationCode?: string;
      checkIn?: string;
      checkOut?: string;
      guestCount?: number;
      status?: string;
      notes?: string;
      receiptId?: string;
    };

    const reservation = await prisma.reservation.create({
      data: {
        hotelId: session.hotelId,
        guestId: body.guestId ?? '',
        roomId: body.roomId,
        confirmationCode: body.confirmationCode ?? `CONF-${Date.now()}`,
        checkIn: body.checkIn ? new Date(body.checkIn) : new Date(),
        checkOut: body.checkOut ? new Date(body.checkOut) : new Date(Date.now() + 86_400_000),
        guestCount: body.guestCount ?? 1,
        status: body.status ?? 'CONFIRMED',
        notes: body.notes,
      },
      include: { guest: true, room: true },
    });

    return jsonOk({
      data: reservation,
      message: `Reservation ${reservation.confirmationCode} created`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
