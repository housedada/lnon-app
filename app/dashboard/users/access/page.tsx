import { auth } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import GrantAccessForm from '@/components/GrantAccessForm';
import ElevatedUserRow from '@/components/ElevatedUserRow';

export const metadata = { title: 'Gestione Accessi' };

const GRID_COLS = '40px minmax(140px, 1fr) minmax(200px, 1.4fr) 160px max-content';

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

      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: GRID_COLS }}>
          <div className="list-cell-deco border-b border-grid-border bg-grid-header-bg" />
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">
            Nome
          </div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">
            Email
          </div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">
            Ruolo
          </div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {elevated.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">Nessun utente con accesso elevato.</div>
          )}

          {elevated.map((u) => (
            <ElevatedUserRow key={u.id} user={u} canRevoke={u.role === 'superadmin' && u.id !== currentUserId} />
          ))}
        </div>
      </div>
    </div>
  );
}
