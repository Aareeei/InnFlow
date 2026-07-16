import type { NextRequest } from 'next/server';
import { prisma } from '@innflow/database';
import { jsonError, jsonOk, requireRequestSession } from '@/lib/api-utils';
import { applyFailureInjection } from '@/lib/failure-injection';
import { findReceiptResource, recordBrowserReceipt } from '@/lib/receipts';

export async function GET(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const receiptId = request.nextUrl.searchParams.get('receiptId');

    if (receiptId) {
      const actionType = request.nextUrl.searchParams.get('actionType') ?? '';
      const existing = await findReceiptResource({
        hotelId: session.hotelId,
        receiptId,
        actionType,
      });
      return jsonOk({ data: existing });
    }

    const receipts = await prisma.browserActionReceipt.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return jsonOk({ data: receipts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRequestSession(request);
    await applyFailureInjection(session.hotelId);
    const body = (await request.json()) as {
      receiptId?: string;
      actionType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.receiptId || !body.actionType || !body.resourceId) {
      return jsonOk(
        { error: { code: 'VALIDATION_ERROR', message: 'receiptId, actionType, and resourceId are required' } },
        400,
      );
    }

    const receipt = await recordBrowserReceipt({
      hotelId: session.hotelId,
      receiptId: body.receiptId,
      actionType: body.actionType,
      resourceId: body.resourceId,
      metadata: body.metadata,
    });

    return jsonOk({
      data: receipt,
      message: `Browser action receipt ${receipt.receiptId} recorded`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
