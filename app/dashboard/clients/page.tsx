import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getClients, getFicConnection } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import BulkMatchClientsButton from '@/components/BulkMatchClientsButton';
import ClientRow from '@/components/ClientRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import ListNavigator from '@/components/ListNavigator';

export const metadata = { title: 'Clienti' };

const PAGE_SIZE = 21;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sync?: string }>;
}) {
  const { q, page, sync } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const { data: clients, total } = await getClients({
    search: q,
    ficSyncStatus: sync,
    limit: PAGE_SIZE,
    offset,
  });
  const ficConnection = await getFicConnection();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'clients', 'create');
  const canUpdate = hasPermission(role, 'clients', 'update');
  const canDelete = canDeleteResource(role, '', '', 'clients');
  const isSuperadmin = role === 'superadmin';

  return (
    <div>
      <NotifyFromQuery param="saved" message="Cliente salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Clienti</h1>
          <p className="mt-1 text-sm text-secondary">{total} clienti totali</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Link
              href="/dashboard/clients/new"
              className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nuovo Cliente
            </Link>
          )}
          {ficConnection && isSuperadmin && <BulkMatchClientsButton />}
        </div>
      </div>

      <ListNavigator
        basePath="/dashboard/clients"
        searchPlaceholder="Cerca per nome, email..."
        q={q}
        sync={sync}
        currentPage={currentPage}
        totalPages={totalPages}
        showSyncFilter={Boolean(ficConnection)}
      >
        <div
          className={`mx-6 mt-6 grid gap-x-[2px] border-t border-grid-border text-[12px] ${
            ficConnection ? 'grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_1fr_1fr_auto]'
          }`}
        >
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Nome</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Città</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">P.IVA</div>
          {ficConnection && (
            <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">FIC</div>
          )}
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Azioni</div>

          {clients.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun cliente trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {clients.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              canUpdate={canUpdate}
              canDelete={canDelete}
              ficConnection={Boolean(ficConnection)}
              canSyncFic={isSuperadmin}
            />
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
