import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const bookings = await prisma.restaurantBooking.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { bookingTime: 'desc' },
    });

    return jsonOk({ data: bookings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = (await request.json()) as {
      guestName?: string;
      partySize?: number;
      bookingTime?: string;
      specialRequests?: string;
      receiptId?: string;
    };

    if (body.receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_RESTAURANT_BOOKING',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Restaurant booking already exists (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const created = await prisma.restaurantBooking.create({
      data: {
        hotelId: session.hotelId,
        guestName: body.guestName ?? 'Guest',
        partySize: body.partySize ?? 2,
        bookingTime: body.bookingTime ? new Date(body.bookingTime) : new Date(),
        specialRequests: body.specialRequests,
        receiptId: body.receiptId,
        status: 'CONFIRMED',
      },
    });

    if (body.receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_RESTAURANT_BOOKING',
        resourceId: created.id,
        metadata: { guestName: created.guestName, partySize: created.partySize },
      });
    }

    return jsonOk({
      data: created,
      message: `Restaurant booking confirmed for ${created.guestName} (${created.partySize} guests)`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
