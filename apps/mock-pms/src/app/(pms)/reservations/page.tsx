import Link from 'next/link';
import { prisma } from '@innflow/database';
import { requireSession } from '@/lib/session';

export default async function ReservationsPage() {
  const session = await requireSession();
  const reservations = await prisma.reservation.findMany({
    where: { hotelId: session.hotelId },
    include: { guest: true, room: true },
    orderBy: { checkIn: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Reservations</div>
      <table className="pms-table" data-testid="reservations-table">
        <thead>
          <tr>
            <th>Confirmation</th>
            <th>Guest</th>
            <th>Room</th>
            <th>Check-in</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id} data-testid={`reservation-row-${reservation.id}`}>
              <td>{reservation.confirmationCode}</td>
              <td>
                {reservation.guest.firstName} {reservation.guest.lastName}
              </td>
              <td>{reservation.room?.roomNumber ?? 'Unassigned'}</td>
              <td>{reservation.checkIn.toISOString().slice(0, 10)}</td>
              <td>{reservation.status}</td>
              <td>
                <Link
                  href={`/reservations/${reservation.id}`}
                  className="pms-button inline-block"
                  data-testid={`reservation-view-${reservation.id}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
