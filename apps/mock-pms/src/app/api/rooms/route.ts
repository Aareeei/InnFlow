import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const rooms = await prisma.room.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { roomNumber: 'asc' },
    });

    return jsonOk({ data: rooms });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = (await request.json()) as {
      roomNumber?: string;
      floor?: number;
      roomType?: string;
      status?: string;
    };

    const room = await prisma.room.create({
      data: {
        hotelId: session.hotelId,
        roomNumber: body.roomNumber ?? '000',
        floor: body.floor ?? 1,
        roomType: body.roomType ?? 'STANDARD',
        status: body.status ?? 'AVAILABLE',
      },
    });

    return jsonOk({ data: room, message: `Room ${room.roomNumber} created` });
  } catch (error) {
    return jsonError(error);
  }
}
