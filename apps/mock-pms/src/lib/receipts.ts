import { prisma } from '@innflow/database';

type ReceiptLookup = {
  hotelId: string;
  receiptId: string;
  actionType: string;
};

export async function findReceiptResource(receipt: ReceiptLookup) {
  const existingReceipt = await prisma.browserActionReceipt.findUnique({
    where: {
      hotelId_receiptId: {
        hotelId: receipt.hotelId,
        receiptId: receipt.receiptId,
      },
    },
  });

  if (!existingReceipt?.resourceId) {
    return { receipt: existingReceipt, resource: null };
  }

  const resourceId = existingReceipt.resourceId;

  switch (receipt.actionType) {
    case 'CREATE_HOUSEKEEPING_REQUEST': {
      const resource = await prisma.housekeepingRequest.findFirst({
        where: { id: resourceId, hotelId: receipt.hotelId },
      });
      return { receipt: existingReceipt, resource };
    }
    case 'CREATE_MAINTENANCE_TICKET': {
      const resource = await prisma.maintenanceTicket.findFirst({
        where: { id: resourceId, hotelId: receipt.hotelId },
      });
      return { receipt: existingReceipt, resource };
    }
    case 'CREATE_WAKE_UP_CALL': {
      const resource = await prisma.wakeUpCall.findFirst({
        where: { id: resourceId, hotelId: receipt.hotelId },
      });
      return { receipt: existingReceipt, resource };
    }
    case 'CREATE_RESTAURANT_BOOKING': {
      const resource = await prisma.restaurantBooking.findFirst({
        where: { id: resourceId, hotelId: receipt.hotelId },
      });
      return { receipt: existingReceipt, resource };
    }
    case 'MODIFY_RESERVATION':
    case 'CANCEL_RESERVATION': {
      const resource = await prisma.reservation.findFirst({
        where: { id: resourceId, hotelId: receipt.hotelId },
      });
      return { receipt: existingReceipt, resource };
    }
    default:
      return { receipt: existingReceipt, resource: null };
  }
}

export async function recordBrowserReceipt(input: {
  hotelId: string;
  receiptId: string;
  actionType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.browserActionReceipt.upsert({
    where: {
      hotelId_receiptId: {
        hotelId: input.hotelId,
        receiptId: input.receiptId,
      },
    },
    create: {
      hotelId: input.hotelId,
      receiptId: input.receiptId,
      actionType: input.actionType,
      resourceId: input.resourceId,
      metadata: (input.metadata ?? {}) as never,
    },
    update: {
      resourceId: input.resourceId,
      metadata: (input.metadata ?? {}) as never,
    },
  });
}
