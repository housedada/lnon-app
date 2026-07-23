import { Suspense } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getProjectInvoices } from '@/lib/db';
import { canViewAmounts } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';
import InvoicesSelectAllCheckbox from '@/components/InvoicesSelectAllCheckbox';
import InvoicesBulkBar from '@/components/InvoicesBulkBar';
import ProjectInvoiceRow from '@/components/ProjectInvoiceRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';

export const metadata = { title: 'Fatture' };

const PAGE_SIZE = 25;

type SearchParams = { q?: string; page?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const isSuperadmin = role === 'superadmin';
  const canManage = role !== 'dipendente';
  const showAmounts = canViewAmounts(role);

  return (
    <div>
      <NotifyFromQuery param="saved" message="Fattura aggiornata." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Fatture</h1>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/invoices/archive"
              aria-label="Archivio fatture"
              title="Archivio fatture"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
            >
              <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/invoices/trash"
              aria-label="Cestino fatture"
              title="Cestino fatture"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
            >
              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      <Suspense fallback={<ListPlaceholder />}>
        <InvoicesListSection params={params} isSuperadmin={isSuperadmin} canManage={canManage} showAmounts={showAmounts} />
      </Suspense>
    </div>
  );
}

async function InvoicesListSection({
  params,
  isSuperadmin,
  canManage,
  showAmounts,
}: {
  params: SearchParams;
  isSuperadmin: boolean;
  canManage: boolean;
  showAmounts: boolean;
}) {
  const { q, page } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data: invoices, total } = await getProjectInvoices({ search: q, limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const invoiceGroupKeys = Object.fromEntries(invoices.map((i) => [i.id, i.clientId ?? i.clientName]));

  const gridCols = canManage
    ? '32px repeat(8, minmax(max-content, 1fr)) max-content'
    : 'repeat(8, minmax(max-content, 1fr))';

  return (
    <ListNavigator
      basePath="/dashboard/invoices"
      searchPlaceholder="Cerca per cliente, progetto o lavoro..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="fatture"
      extraTopControls={canManage ? <InvoicesBulkBar invoiceGroupKeys={invoiceGroupKeys} /> : undefined}
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: gridCols }}>
          {canManage && (
            <div className="list-cell-deco flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
              <InvoicesSelectAllCheckbox invoiceIds={invoices.map((i) => i.id)} />
            </div>
          )}
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Progetto</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Lavoro</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Imponibile</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">IVA</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Creata il</div>
          {canManage && <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />}

          {invoices.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessuna fattura trovata{q ? ` per “${q}”` : ''}. Le fatture vengono generate segnando un progetto come completato.
            </div>
          )}

          {invoices.map((invoice) => (
            <ProjectInvoiceRow key={invoice.id} invoice={invoice} isSuperadmin={isSuperadmin} canManage={canManage} showAmounts={showAmounts} />
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
