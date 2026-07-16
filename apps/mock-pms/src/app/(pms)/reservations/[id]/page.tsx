import { notFound } from 'next/navigation';
import { prisma } from '@innflow/database';
import { requireSession } from '@/lib/session';
import { ReservationDetailClient } from './ReservationDetailClient';

type PageProps = { params: Promise<{ id: string }> };

export default async function ReservationDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { id } = await params;

  const reservation = await prisma.reservation.findFirst({
    where: { id, hotelId: session.hotelId },
    include: { guest: true, room: true },
  });

  if (!reservation) {
    notFound();
  }

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base" data-testid="reservation-detail-header">
        Reservation {reservation.confirmationCode}
      </div>

      <div className="border border-pms-border bg-pms-panel p-3 text-sm" data-testid="reservation-detail">
        <p>
          <strong>Guest:</strong> {reservation.guest.firstName} {reservation.guest.lastName}
        </p>
        <p>
          <strong>Room:</strong> {reservation.room?.roomNumber ?? 'Unassigned'}
        </p>
        <p>
          <strong>Status:</strong> {reservation.status}
        </p>
        <p>
          <strong>Check-in:</strong> {reservation.checkIn.toISOString()}
        </p>
        <p>
          <strong>Check-out:</strong> {reservation.checkOut.toISOString()}
        </p>
      </div>

      <ReservationDetailClient
        reservationId={reservation.id}
        confirmationCode={reservation.confirmationCode}
        initialNotes={reservation.notes ?? ''}
      />
    </div>
  );
}
