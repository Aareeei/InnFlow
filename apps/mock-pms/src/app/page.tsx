import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';

export default async function HomePage() {
  const session = await getSessionFromCookies();
  redirect(session ? '/reservations' : '/login');
}
