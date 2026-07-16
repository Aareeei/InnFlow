import { prisma } from '@innflow/database';
import { ActionForm } from '@/components/ActionForm';
import { requireSession } from '@/lib/session';

export default async function RoomsPage() {
  const session = await requireSession();
  const rooms = await prisma.room.findMany({
    where: { hotelId: session.hotelId },
    orderBy: { roomNumber: 'asc' },
  });

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Room Inventory</div>

      <ActionForm
        endpoint="/api/rooms"
        testIdPrefix="room-create"
        submitLabel="Add Room"
        successTemplate="Room created successfully"
        fields={[
          { name: 'roomNumber', label: 'Room Number', testId: 'room-number' },
          { name: 'floor', label: 'Floor', testId: 'room-floor', type: 'number' },
          { name: 'roomType', label: 'Room Type', testId: 'room-type', defaultValue: 'STANDARD' },
          { name: 'status', label: 'Status', testId: 'room-status', defaultValue: 'AVAILABLE' },
        ]}
      />

      <table className="pms-table" data-testid="rooms-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Floor</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} data-testid={`room-row-${room.id}`}>
              <td>{room.roomNumber}</td>
              <td>{room.floor}</td>
              <td>{room.roomType}</td>
              <td>{room.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
