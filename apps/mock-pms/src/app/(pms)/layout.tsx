import { redirect } from 'next/navigation';
import { prisma } from '@innflow/database';
import { PmsShell } from '@/components/PmsShell';
import { getSessionFromCookies } from '@/lib/session';

export default async function PmsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/login');
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: session.hotelId } });

  return (
    <PmsShell hotelName={hotel?.name ?? 'Unknown Hotel'} username={session.username}>
      {children}
    </PmsShell>
  );
}
