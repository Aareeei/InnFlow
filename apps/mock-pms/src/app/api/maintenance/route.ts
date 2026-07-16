import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
    });

    return jsonOk({ data: tickets });
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
      issue?: string;
      priority?: string;
      receiptId?: string;
    };

    if (body.receiptId) {
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_MAINTENANCE_TICKET',
      });
      if (existing.resource) {
        return jsonOk({
          data: existing.resource,
          message: 'Maintenance ticket already exists (idempotent receipt)',
          idempotent: true,
        });
      }
    }

    const created = await prisma.maintenanceTicket.create({
      data: {
        hotelId: session.hotelId,
        roomNumber: body.roomNumber ?? '000',
        issue: body.issue ?? 'General maintenance',
        priority: body.priority ?? 'NORMAL',
        receiptId: body.receiptId,
        status: 'OPEN',
      },
    });

    if (body.receiptId) {
      await recordBrowserReceipt({
        hotelId: session.hotelId,
        receiptId: body.receiptId,
        actionType: 'CREATE_MAINTENANCE_TICKET',
        resourceId: created.id,
        metadata: { roomNumber: created.roomNumber, issue: created.issue },
      });
    }

    return jsonOk({
      data: created,
      message: `Maintenance ticket #${created.id.slice(0, 8)} opened for room ${created.roomNumber}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
