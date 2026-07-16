import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function MaintenancePage() {
  const session = await requireSession();
  const tickets = await prisma.maintenanceTicket.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Maintenance Tickets</div>

      <ActionForm
        endpoint="/api/maintenance"
        testIdPrefix="maintenance-create"
        submitLabel="Open Ticket"
        successTemplate="Maintenance ticket created successfully"
        fields={[
          { name: 'roomNumber', label: 'Room Number', testId: 'maintenance-room-number' },
          { name: 'issue', label: 'Issue Description', testId: 'maintenance-issue' },
          { name: 'priority', label: 'Priority', testId: 'maintenance-priority', defaultValue: 'NORMAL' },
          { name: 'receiptId', label: 'Receipt ID', testId: 'maintenance-receipt-id', required: false },
        ]}
      />

      <table className="pms-table" data-testid="maintenance-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Issue</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} data-testid={`maintenance-row-${ticket.id}`}>
              <td>{ticket.roomNumber}</td>
              <td>{ticket.issue}</td>
              <td>{ticket.priority}</td>
              <td>{ticket.status}</td>
              <td>{ticket.receiptId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
