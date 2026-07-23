import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getClients, getFicConnection, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import BulkMatchClientsButton from '@/components/BulkMatchClientsButton';
import ClientRow from '@/components/ClientRow';
import NewClientButton from '@/components/NewClientButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';

export const metadata = { title: 'Clienti' };

const PAGE_SIZE = 21;

type SearchParams = { q?: string; page?: string; sync?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [ficConnection, clientOptions, contractOptions, productOptions, allUsers] = await Promise.all([
    getFicConnection(),
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));

  const canCreate = hasPermission(role, 'clients', 'create');
  const canUpdate = hasPermission(role, 'clients', 'update');
  const canDelete = canDeleteResource(role, '', '', 'clients');
  const canCreateJobs = hasPermission(role, 'jobs', 'create');
  const isSuperadmin = role === 'superadmin';

  return (
    <div>
      <NotifyFromQuery param="saved" message="Cliente salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Clienti</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && <NewClientButton />}
          {ficConnection && isSuperadmin && <BulkMatchClientsButton />}
        </div>
      </div>

      <Suspense fallback={<ListPlaceholder />}>
        <ClientsListSection
          params={params}
          ficConnection={Boolean(ficConnection)}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canCreateJobs={canCreateJobs}
          isSuperadmin={isSuperadmin}
          clientOptions={clientOptions}
          contractOptions={contractOptions}
          productOptions={productOptions}
          userOptions={userOptions}
        />
      </Suspense>
    </div>
  );
}

async function ClientsListSection({
  params,
  ficConnection,
  canUpdate,
  canDelete,
  canCreateJobs,
  isSuperadmin,
  clientOptions,
  contractOptions,
  productOptions,
  userOptions,
}: {
  params: SearchParams;
  ficConnection: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreateJobs: boolean;
  isSuperadmin: boolean;
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const { q, page, sync } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data: clients, total } = await getClients({
    search: q,
    ficSyncStatus: sync,
    limit: PAGE_SIZE,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ListNavigator
      basePath="/dashboard/clients"
      searchPlaceholder="Cerca per nome, email..."
      q={q}
      sync={sync}
      currentPage={currentPage}
      totalPages={totalPages}
      showSyncFilter={ficConnection}
      totalCount={total}
      totalLabel="clienti"
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div
          className="grid w-full text-[12px]"
          style={{
            gridTemplateColumns: ficConnection
              ? 'repeat(4, minmax(max-content, 1fr)) max-content'
              : 'repeat(3, minmax(max-content, 1fr)) max-content',
          }}
        >
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Nome</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Città</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">P.IVA</div>
          {ficConnection && (
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">FIC</div>
          )}
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

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
              isSuperadmin={isSuperadmin}
              ficConnection={ficConnection}
              canSyncFic={isSuperadmin}
              canCreateJobs={canCreateJobs}
              clientOptions={clientOptions}
              contractOptions={contractOptions}
              productOptions={productOptions}
              userOptions={userOptions}
            />
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
