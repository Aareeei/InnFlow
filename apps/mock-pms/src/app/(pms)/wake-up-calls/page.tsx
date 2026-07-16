import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function WakeUpCallsPage() {
  const session = await requireSession();
  const calls = await prisma.wakeUpCall.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Wake-up Calls</div>

      <ActionForm
        endpoint="/api/wake-up-calls"
        testIdPrefix="wake-up-call-create"
        submitLabel="Schedule Call"
        successTemplate="Wake-up call scheduled successfully"
        fields={[
          { name: 'roomNumber', label: 'Room Number', testId: 'wake-up-call-room-number' },
          { name: 'callTime', label: 'Call Time (HH:MM)', testId: 'wake-up-call-time', defaultValue: '06:30' },
          { name: 'receiptId', label: 'Receipt ID', testId: 'wake-up-call-receipt-id', required: false },
        ]}
      />

      <table className="pms-table" data-testid="wake-up-calls-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Time</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id} data-testid={`wake-up-call-row-${call.id}`}>
              <td>{call.roomNumber}</td>
              <td>{call.callTime}</td>
              <td>{call.status}</td>
              <td>{call.receiptId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
