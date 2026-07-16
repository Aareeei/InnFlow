import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function HousekeepingPage() {
  const session = await requireSession();
  const requests = await prisma.housekeepingRequest.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Housekeeping Requests</div>

      <ActionForm
        endpoint="/api/housekeeping"
        testIdPrefix="housekeeping-create"
        submitLabel="Create Request"
        successTemplate="Housekeeping request created successfully"
        fields={[
          { name: 'roomNumber', label: 'Room Number', testId: 'housekeeping-room-number' },
          { name: 'item', label: 'Item', testId: 'housekeeping-item', defaultValue: 'towels' },
          { name: 'quantity', label: 'Quantity', testId: 'housekeeping-quantity', type: 'number', defaultValue: '1' },
          { name: 'notes', label: 'Notes', testId: 'housekeeping-notes', required: false },
          { name: 'receiptId', label: 'Receipt ID', testId: 'housekeeping-receipt-id', required: false },
        ]}
      />

      <table className="pms-table" data-testid="housekeeping-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} data-testid={`housekeeping-row-${request.id}`}>
              <td>{request.roomNumber}</td>
              <td>{request.item}</td>
              <td>{request.quantity}</td>
              <td>{request.status}</td>
              <td>{request.receiptId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
