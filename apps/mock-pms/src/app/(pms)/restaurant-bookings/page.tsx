import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function RestaurantBookingsPage() {
  const session = await requireSession();
  const bookings = await prisma.restaurantBooking.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { bookingTime: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Restaurant Bookings</div>

      <ActionForm
        endpoint="/api/restaurant-bookings"
        testIdPrefix="restaurant-booking-create"
        submitLabel="Create Booking"
        successTemplate="Restaurant booking confirmed successfully"
        fields={[
          { name: 'guestName', label: 'Guest Name', testId: 'restaurant-booking-guest-name' },
          { name: 'partySize', label: 'Party Size', testId: 'restaurant-booking-party-size', type: 'number', defaultValue: '2' },
          {
            name: 'bookingTime',
            label: 'Booking Time (ISO)',
            testId: 'restaurant-booking-time',
            defaultValue: new Date().toISOString(),
          },
          { name: 'specialRequests', label: 'Special Requests', testId: 'restaurant-booking-special-requests', required: false },
          { name: 'receiptId', label: 'Receipt ID', testId: 'restaurant-booking-receipt-id', required: false },
        ]}
      />

      <table className="pms-table" data-testid="restaurant-bookings-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Party</th>
            <th>Time</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} data-testid={`restaurant-booking-row-${booking.id}`}>
              <td>{booking.guestName}</td>
              <td>{booking.partySize}</td>
              <td>{booking.bookingTime.toISOString()}</td>
              <td>{booking.status}</td>
              <td>{booking.receiptId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
