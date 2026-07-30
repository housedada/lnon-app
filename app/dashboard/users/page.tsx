import { auth } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import UserFormModal from '@/components/UserFormModal';
import UserRow from '@/components/UserRow';
import type { UserRole } from '@/lib/types';

export const metadata = { title: 'Utenti' };

const GRID_COLS = '40px minmax(140px, 1fr) minmax(200px, 1.4fr) 160px 140px max-content';

export default async function UsersPage() {
  const session = await auth();
  const role = (session?.user as { role?: UserRole } | undefined)?.role ?? 'dipendente';
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const canCreate = hasPermission(role, 'users', 'create');
  const canUpdate = hasPermission(role, 'users', 'update');
  const canDelete = canDeleteResource(role, '', '', 'users');

  const users = await getUsers();

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Utenti</h1>
        {canCreate && <UserFormModal mode="create" />}
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
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">
            Stato
          </div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {users.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">Nessun utente.</div>
          )}

          {users.map((u) => (
            <UserRow key={u.id} user={u} canUpdate={canUpdate} canDelete={canDelete} isSelf={u.id === currentUserId} />
          ))}
        </div>
      </div>
    </div>
  );
}
