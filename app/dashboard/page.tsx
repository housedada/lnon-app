import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DashboardRouterPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'dipendente';
  redirect(`/dashboard/${role}`);
}
