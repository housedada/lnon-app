import { Archive } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProjectInvoices, getArchivedProjectInvoiceYears } from '@/lib/db';
import ListNavigator from '@/components/ListNavigator';
import UnarchiveInvoiceButton from '@/components/UnarchiveInvoiceButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import LazyRevealRows from '@/components/LazyRevealRows';
import RowActionsCell from '@/components/RowActionsCell';
import { parsePageSize } from '@/lib/listPageSize';

export const metadata = { title: 'Archivio Fatture' };

const GRID_TEMPLATE = 'repeat(6, minmax(max-content, 1fr)) max-content';

function formatAmount(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default async function InvoicesArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; year?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam, year } = await searchParams;
  const pageSize = parsePageSize(pageSizeParam);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;
  const archivedYear = year ? Number(year) : undefined;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || role === 'dipendente') {
    redirect('/dashboard');
  }

  const [{ data: invoices, total }, years] = await Promise.all([
    getProjectInvoices({ search: q, archived: true, archivedYear, limit: pageSize, offset }),
    getArchivedProjectInvoiceYears(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Fattura aggiornata." />
      <RememberRoute storageKey="invoices-tab" tabKey="archive" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <Archive size={22} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            Archivio Fatture
          </h1>
        </div>
      </div>

      <div className="mx-6 mt-6 flex flex-wrap items-center gap-2">
        <a
          href="/dashboard/invoices/archive"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            !archivedYear ? 'border-transparent bg-grid-header-bg text-primary' : 'border-grid-border text-secondary hover:bg-row-hover'
          }`}
        >
          Tutti gli anni
        </a>
        {years.map((y) => (
          <a
            key={y}
            href={`/dashboard/invoices/archive?year=${y}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              archivedYear === y ? 'border-transparent bg-grid-header-bg text-primary' : 'border-grid-border text-secondary hover:bg-row-hover'
            }`}
          >
            {y}
          </a>
        ))}
      </div>

      <ListNavigator
        basePath="/dashboard/invoices/archive"
        searchPlaceholder="Cerca per cliente, progetto o lavoro..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="fatture archiviate"
      >
        <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
          <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Progetto</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Creata il</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Archiviata il</div>
            <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

            {invoices.length === 0 && (
              <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
                Nessuna fattura archiviata{q ? ` per “${q}”` : ''}.
              </div>
            )}

            <LazyRevealRows total={invoices.length} enabled={pageSize > 25}>
              {invoices.map((invoice) => (
                <div key={invoice.id} className="group contents">
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{invoice.clientName}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.projectTitle}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold text-primary group-hover:bg-row-hover">{formatAmount(invoice.totalAmount)}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                    <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">{invoice.status}</span>
                  </div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(invoice.createdAt)}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(invoice.archivedAt)}</div>
                  <RowActionsCell>
                    <UnarchiveInvoiceButton invoiceId={invoice.id} />
                  </RowActionsCell>
                </div>
              ))}
            </LazyRevealRows>
          </div>
        </div>
      </ListNavigator>
    </div>
  );
}
