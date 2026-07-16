import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const requests = await prisma.housekeepingRequest.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({ data: requests });
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
      item?: string;
      quantity?: number;
      notes?: string;
      receiptId?: string;
    };

    if (body.receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_HOUSEKEEPING_REQUEST',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Housekeeping request already exists (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const created = await prisma.housekeepingRequest.create({
      data: {
        hotelId: session.hotelId,
        roomNumber: body.roomNumber ?? '000',
        item: body.item ?? 'supplies',
        quantity: body.quantity ?? 1,
        notes: body.notes,
        receiptId: body.receiptId,
        status: 'PENDING',
      },
    });

    if (body.receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_HOUSEKEEPING_REQUEST',
        resourceId: created.id,
        metadata: { roomNumber: created.roomNumber, item: created.item },
      });
    }

    return jsonOk({
      data: created,
      message: `Housekeeping request #${created.id.slice(0, 8)} created for room ${created.roomNumber}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
