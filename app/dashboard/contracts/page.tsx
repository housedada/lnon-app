import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getContracts, getContractsStats, getAllClientNames } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';
import ContractsFilterWidget from '@/components/ContractsFilterWidget';
import ContractsStatsWidget from '@/components/ContractsStatsWidget';
import SyncContractsClientsButton from '@/components/SyncContractsClientsButton';
import NewContractButton from '@/components/NewContractButton';
import ContractRow from '@/components/ContractRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';

export const metadata = { title: 'Contratti' };

const PAGE_SIZE = 25;

// Colonne dati (tutte tranne "Azioni", che resta fissa a destra).
// grid-template-columns usa max-content per adattarsi al contenuto: la
// griglia può superare la larghezza del contenitore, che scrolla in
// orizzontale (overflow-x-auto sul wrapper).
const DATA_COLUMNS: { key: string; label: string }[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'linkStatus', label: 'Sync' },
  { key: 'site', label: 'Sito' },
  { key: 'status', label: 'Stato' },
  { key: 'billingMonth', label: 'Mese fatturazione' },
  { key: 'maintenance', label: 'Manutenzione WP' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'analytics', label: 'Analytics e GDPR' },
  { key: 'cookie', label: 'Cookie' },
  { key: 'total', label: 'Totale' },
  { key: 'serviceDescription', label: 'Servizio' },
  { key: 'package', label: 'Pacchetto' },
  { key: 'notes', label: 'Note' },
  { key: 'provider', label: 'Provider' },
  { key: 'providerPlan', label: 'Piano provider' },
  { key: 'providerExpiryDate', label: 'Scadenza' },
  { key: 'providerCost', label: 'Costo provider' },
];

const GRID_TEMPLATE = `repeat(${DATA_COLUMNS.length}, max-content) 150px`;

type SearchParams = { q?: string; page?: string; status?: string; categories?: string };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [stats, clientOptions] = await Promise.all([getContractsStats(), getAllClientNames()]);

  const canCreate = hasPermission(role, 'contracts', 'create');
  const canUpdate = hasPermission(role, 'contracts', 'update');
  const canDelete = canDeleteResource(role, '', '', 'contracts');
  const isSuperadmin = role === 'superadmin';

  return (
    <div>
      <NotifyFromQuery param="saved" message="Contratto salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Contratti</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && <NewContractButton clientOptions={clientOptions} />}
          {canUpdate && <SyncContractsClientsButton />}
        </div>
      </div>

      <ContractsStatsWidget stats={stats} />
      <ContractsFilterWidget />

      <Suspense fallback={<ListPlaceholder />}>
        <ContractsListSection params={params} clientOptions={clientOptions} canUpdate={canUpdate} canDelete={canDelete} isSuperadmin={isSuperadmin} />
      </Suspense>
    </div>
  );
}

async function ContractsListSection({
  params,
  clientOptions,
  canUpdate,
  canDelete,
  isSuperadmin,
}: {
  params: SearchParams;
  clientOptions: { id: string; name: string }[];
  canUpdate: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
}) {
  const { q, page, status, categories } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const categoryList = categories ? categories.split(',').filter(Boolean) : undefined;

  const { data: contracts, total } = await getContracts({ search: q, status, categories: categoryList, limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ListNavigator
      basePath="/dashboard/contracts"
      searchPlaceholder="Cerca per cliente o sito..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="contratti"
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className="grid w-fit min-w-full gap-x-[2px] text-[12px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {DATA_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary"
            >
              {col.label}
            </div>
          ))}
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {contracts.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun contratto trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {contracts.map((contract) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              dataColumns={DATA_COLUMNS}
              canUpdate={canUpdate}
              canDelete={canDelete}
              isSuperadmin={isSuperadmin}
              clientOptions={clientOptions}
            />
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
