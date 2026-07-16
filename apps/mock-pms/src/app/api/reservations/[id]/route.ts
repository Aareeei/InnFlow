import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const { id } = await context.params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, hotelId: session.hotelId },
      include: { guest: true, room: true },
    });

    if (!reservation) {
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Reservation not found' } }, 404);
    }

    return jsonOk({ data: reservation });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      notes?: string;
      checkIn?: string;
      checkOut?: string;
      guestCount?: number;
      roomId?: string;
      receiptId?: string;
    };

    if (body.receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'MODIFY_RESERVATION',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Reservation already modified (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
        checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
        guestCount: body.guestCount,
        roomId: body.roomId,
      },
      include: { guest: true, room: true },
    });

    if (body.receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'MODIFY_RESERVATION',
        resourceId: reservation.id,
        metadata: { notes: body.notes },
      });
    }

    return jsonOk({
      data: reservation,
      message: `Reservation ${reservation.confirmationCode} updated successfully`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const { id } = await context.params;
    const receiptId = request.nextUrl.searchParams.get('receiptId') ?? undefined;

    if (receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId,
        actionType: 'CANCEL_RESERVATION',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Reservation already cancelled (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { guest: true, room: true },
    });

    if (receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId,
        actionType: 'CANCEL_RESERVATION',
        resourceId: reservation.id,
      });
    }

    return jsonOk({
      data: reservation,
      message: `Reservation ${reservation.confirmationCode} cancelled successfully`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
