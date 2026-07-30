import { auth } from '@/lib/auth';
import { getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import UserFormModal from '@/components/UserFormModal';
import UserRow from '@/components/UserRow';
import type { UserRole } from '@/lib/types';

export const metadata = { title: 'Utenti' };

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

      <div className="mx-6 mt-6 max-w-2xl">
        {users.length === 0 ? (
          <p className="rounded-lg border border-grid-border px-4 py-8 text-center text-sm text-secondary">Nessun utente.</p>
        ) : (
          <ul className="divide-y divide-grid-border rounded-lg border border-grid-border">
            {users.map((u) => (
              <UserRow key={u.id} user={u} canUpdate={canUpdate} canDelete={canDelete} isSelf={u.id === currentUserId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
