import Link from 'next/link';
import { Suspense } from 'react';
import { Pencil } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getContracts, getContractsStats, getAllClientNames } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';
import ContractsFilterWidget from '@/components/ContractsFilterWidget';
import ContractsStatsWidget from '@/components/ContractsStatsWidget';
import SyncContractsClientsButton from '@/components/SyncContractsClientsButton';
import ContractLinkButton from '@/components/ContractLinkButton';
import NewContractButton from '@/components/NewContractButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import type { Contract, ContractStatus } from '@/lib/types';

export const metadata = { title: 'Contratti' };

const PAGE_SIZE = 25;

const STATUS_LABEL: Record<ContractStatus, string> = {
  attivo: 'Attivo',
  da_definire: 'Da definire',
  disattivo: 'Disattivo',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  attivo: 'bg-green-600/10 text-green-700',
  da_definire: 'bg-grid-header-bg text-secondary',
  disattivo: 'bg-red-600/10 text-red-700',
};

function formatAmount(value?: number) {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

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

const GRID_TEMPLATE = `repeat(${DATA_COLUMNS.length}, max-content) 40px 40px`;

function renderCell(contract: Contract, key: string): React.ReactNode {
  switch (key) {
    case 'client':
      return contract.clientName ?? contract.clientNameRaw;
    case 'linkStatus':
      return contract.clientId ? (
        <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>
      ) : (
        <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>
      );
    case 'site':
      return contract.site ?? '—';
    case 'status':
      return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>
          {STATUS_LABEL[contract.status]}
        </span>
      );
    case 'billingMonth':
      return contract.billingMonth ?? '—';
    case 'maintenance':
      return formatAmount(contract.maintenanceWpAmount);
    case 'hosting':
      return formatAmount(contract.hostingAmount);
    case 'analytics':
      return formatAmount(contract.analyticsGdprAmount);
    case 'cookie':
      return formatAmount(contract.cookieAmount);
    case 'total':
      return formatAmount(contract.totalAmount);
    case 'serviceDescription':
      return contract.serviceDescription ?? '—';
    case 'package':
      return contract.package ?? '—';
    case 'notes':
      return contract.notes ?? '—';
    case 'provider':
      return contract.provider ?? '—';
    case 'providerPlan':
      return contract.providerPlan ?? '—';
    case 'providerExpiryDate':
      return formatDate(contract.providerExpiryDate);
    case 'providerCost':
      return formatAmount(contract.providerCost);
    default:
      return '—';
  }
}

type SearchParams = { q?: string; page?: string; status?: string; categories?: string };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [stats, clientOptions] = await Promise.all([getContractsStats(), getAllClientNames()]);

  const canCreate = hasPermission(role, 'contracts', 'create');
  const canUpdate = hasPermission(role, 'contracts', 'update');

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
        <ContractsListSection params={params} clientOptions={clientOptions} canUpdate={canUpdate} />
      </Suspense>
    </div>
  );
}

async function ContractsListSection({
  params,
  clientOptions,
  canUpdate,
}: {
  params: SearchParams;
  clientOptions: { id: string; name: string }[];
  canUpdate: boolean;
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
    >
      <p className="mx-6 mt-6 text-sm text-secondary">{total} contratti totali</p>
      <div className="mx-6 mt-2 overflow-x-auto border-t border-grid-border">
        <div className="grid w-fit min-w-full gap-x-[2px] text-[12px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          {DATA_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary"
            >
              {col.label}
            </div>
          ))}
          <div className="sticky right-10 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {contracts.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun contratto trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {contracts.map((contract) => (
            <div key={contract.id} className="group contents">
              {DATA_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border bg-card-bg px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary [&:first-child]:font-semibold [&:first-child]:tracking-[0.01em] [&:first-child]:text-primary"
                >
                  {renderCell(contract, col.key)}
                </div>
              ))}
              <div className="sticky right-10 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
                {canUpdate && !contract.clientId && (
                  <ContractLinkButton
                    contractId={contract.id}
                    contractClientName={contract.clientNameRaw}
                    clientOptions={clientOptions}
                  />
                )}
              </div>
              <div className="sticky right-0 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
                {canUpdate && (
                  <Link
                    href={`/dashboard/contracts/${contract.id}/edit`}
                    aria-label="Modifica contratto"
                    className="text-secondary transition hover:text-primary"
                  >
                    <Pencil size={15} strokeWidth={1.75} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
