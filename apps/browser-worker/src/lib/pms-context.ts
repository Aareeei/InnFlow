import { prisma } from '@innflow/database';
import { BrowserAutomationError } from '@innflow/domain';
import { loadConfig } from '@innflow/config';

export type PmsContext = {
  hotelId: string;
  hotelName: string;
  tenantId: string;
  pmsBaseUrl: string;
  username: string;
  password: string;
};

export async function resolvePmsContext(tenantId: string): Promise<PmsContext> {
  const hotel = await prisma.hotel.findUnique({
    where: { tenantId },
  });

  if (!hotel) {
    throw new BrowserAutomationError(`No hotel found for tenant ${tenantId}`, { tenantId });
  }

  const username = process.env.PMS_BOT_USERNAME ?? 'staff';
  const password = process.env.PMS_BOT_PASSWORD ?? 'pms123';

  const pmsUser = await prisma.pmsUser.findFirst({
    where: {
      hotelId: hotel.id,
      username,
    },
  });

  if (!pmsUser) {
    throw new BrowserAutomationError(`No PMS user '${username}' found for hotel ${hotel.id}`, {
      tenantId,
      hotelId: hotel.id,
    });
  }

  const config = loadConfig();

  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    tenantId,
    pmsBaseUrl: config.MOCK_PMS_URL,
    username,
    password,
  };
}

export async function resolveReservationId(hotelId: string, reservationRef?: string): Promise<string> {
  if (!reservationRef) {
    throw new BrowserAutomationError('Reservation reference is required');
  }

  const byId = await prisma.reservation.findFirst({
    where: { id: reservationRef, hotelId },
  });
  if (byId) {
    return byId.id;
  }

  const byCode = await prisma.reservation.findFirst({
    where: { confirmationCode: reservationRef, hotelId },
  });
  if (byCode) {
    return byCode.id;
  }

  throw new BrowserAutomationError(`Reservation not found: ${reservationRef}`, { hotelId, reservationRef });
}
