import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const calls = await prisma.wakeUpCall.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({ data: calls });
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
      callTime?: string;
      receiptId?: string;
    };

    if (body.receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_WAKE_UP_CALL',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Wake-up call already scheduled (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const created = await prisma.wakeUpCall.create({
      data: {
        hotelId: session.hotelId,
        roomNumber: body.roomNumber ?? '000',
        callTime: body.callTime ?? '06:30',
        receiptId: body.receiptId,
        status: 'SCHEDULED',
      },
    });

    if (body.receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_WAKE_UP_CALL',
        resourceId: created.id,
        metadata: { roomNumber: created.roomNumber, callTime: created.callTime },
      });
    }

    return jsonOk({
      data: created,
      message: `Wake-up call scheduled for room ${created.roomNumber} at ${created.callTime}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
