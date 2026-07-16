import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function GuestsPage() {
  const session = await requireSession();
  const guests = await prisma.guest.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Guest Registry</div>

      <ActionForm
        endpoint="/api/guests"
        testIdPrefix="guest-create"
        submitLabel="Add Guest"
        successTemplate="Guest created successfully"
        fields={[
          { name: 'firstName', label: 'First Name', testId: 'guest-first-name' },
          { name: 'lastName', label: 'Last Name', testId: 'guest-last-name' },
          { name: 'email', label: 'Email', testId: 'guest-email', required: false },
          { name: 'phone', label: 'Phone', testId: 'guest-phone', required: false },
        ]}
      />

      <table className="pms-table" data-testid="guests-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} data-testid={`guest-row-${guest.id}`}>
              <td>
                {guest.firstName} {guest.lastName}
              </td>
              <td>{guest.email ?? '—'}</td>
              <td>{guest.phone ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
