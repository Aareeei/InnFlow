import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const guests = await prisma.guest.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({ data: guests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    const guest = await prisma.guest.create({
      data: {
        hotelId: session.hotelId,
        firstName: body.firstName ?? 'Guest',
        lastName: body.lastName ?? 'Unknown',
        email: body.email,
        phone: body.phone,
      },
    });

    return jsonOk({ data: guest, message: `Guest ${guest.firstName} ${guest.lastName} created` });
  } catch (error) {
    return jsonError(error);
  }
}
