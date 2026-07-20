import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import PageTransition from '@/components/PageTransition';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const user = session.user as typeof session.user & {
    role: 'superadmin' | 'admin' | 'dipendente';
    active: boolean;
    error?: string;
  };

  if (user.error || user.active === false) {
    redirect(`/auth/error?error=${user.error ?? 'USER_INACTIVE'}`);
  }

  return (
    <div className="content-area flex min-h-screen flex-col md:flex-row">
      <Sidebar role={user.role} userName={user.name ?? user.email ?? ''} />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
