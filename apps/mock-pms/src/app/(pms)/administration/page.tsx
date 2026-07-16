import { prisma } from '@innflow/database';
import { requireSession } from '@/lib/session';

export default async function AdministrationPage() {
  const session = await requireSession();
  const [hotel, users, receipts] = await Promise.all([
    prisma.hotel.findUnique({ where: { id: session.hotelId } }),
    prisma.pmsUser.findMany({ where: { hotelId: session.hotelId } }),
    prisma.browserActionReceipt.findMany({
      where: { hotelId: session.hotelId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-3">
      <div className="pms-titlebar text-base">Administration</div>

      <div className="border border-pms-border bg-pms-panel p-3 text-sm" data-testid="admin-hotel-info">
        <p>
          <strong>Hotel:</strong> {hotel?.name}
        </p>
        <p>
          <strong>Address:</strong> {hotel?.address ?? 'Not set'}
        </p>
        <p>
          <strong>Hotel ID:</strong> {hotel?.id}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-bold">PMS Users</h2>
        <table className="pms-table" data-testid="admin-users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid={`admin-user-row-${user.id}`}>
                <td>{user.username}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-bold">Recent Browser Action Receipts</h2>
        <table className="pms-table" data-testid="admin-receipts-table">
          <thead>
            <tr>
              <th>Receipt ID</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id} data-testid={`admin-receipt-row-${receipt.id}`}>
                <td>{receipt.receiptId}</td>
                <td>{receipt.actionType}</td>
                <td>{receipt.resourceId ?? '—'}</td>
                <td>{receipt.createdAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
