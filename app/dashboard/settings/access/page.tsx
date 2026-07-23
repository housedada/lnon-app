import { auth } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { getRoleLabel } from '@/lib/permissions';
import GrantAccessForm from '@/components/GrantAccessForm';
import RevokeAccessButton from '@/components/RevokeAccessButton';

export const metadata = { title: 'Gestione Accessi' };

export default async function AccessSettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  if (role !== 'superadmin') {
    return (
      <div>
        <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Gestione Accessi</h1>
        <p className="px-6 pt-2 text-sm text-secondary">Solo un superadmin può accedere a questa pagina.</p>
      </div>
    );
  }

  const users = await getUsers();
  const elevated = users.filter((u) => u.role === 'superadmin' || u.role === 'admin');

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Gestione Accessi</h1>
      <p className="px-6 pt-1 text-sm text-secondary">
        Concedi accesso superadmin a un utente già registrato (deve aver già effettuato il primo accesso a Housedada),
        salvo eccezioni future.
      </p>

      <div className="mx-6 mt-6 max-w-xl rounded-lg border border-grid-border p-5">
        <GrantAccessForm />
      </div>

      <div className="mx-6 mt-6 max-w-xl">
        <h2 className="detail-label mb-2">Utenti con accesso elevato</h2>
        <ul className="divide-y divide-grid-border rounded-lg border border-grid-border">
          {elevated.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-primary">{u.name}</p>
                <p className="text-xs text-secondary">
                  {u.email} · {getRoleLabel(u.role)}
                </p>
              </div>
              {u.role === 'superadmin' && u.id !== currentUserId && <RevokeAccessButton userId={u.id} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
