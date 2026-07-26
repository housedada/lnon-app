import { Trash2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProjectInvoices } from '@/lib/db';
import ListNavigator from '@/components/ListNavigator';
import RestoreInvoiceButton from '@/components/RestoreInvoiceButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import LazyRevealRows from '@/components/LazyRevealRows';
import { parsePageSize } from '@/lib/listPageSize';

export const metadata = { title: 'Cestino Fatture' };

function formatAmount(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default async function InvoicesTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam } = await searchParams;
  const pageSize = parsePageSize(pageSizeParam);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || role === 'dipendente') {
    redirect('/dashboard');
  }

  const { data: invoices, total } = await getProjectInvoices({ search: q, trashed: true, limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Fattura aggiornata." />
      <RememberRoute storageKey="invoices-tab" tabKey="trash" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <Trash2 size={22} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            Cestino Fatture
          </h1>
        </div>
      </div>

      <ListNavigator
        basePath="/dashboard/invoices/trash"
        searchPlaceholder="Cerca per cliente, progetto o lavoro..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="fatture nel cestino"
      >
        <div className="mx-6 mt-6 grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_40px] gap-x-[2px] border-t border-grid-border text-[12px]">
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Progetto</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Creata il</div>
          <div className="border-b border-grid-border bg-grid-header-bg" />

          {invoices.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessuna fattura nel cestino{q ? ` per “${q}”` : ''}.
            </div>
          )}

          <LazyRevealRows total={invoices.length} enabled={pageSize > 25}>
            {invoices.map((invoice) => (
              <div key={invoice.id} className="group contents">
                <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{invoice.clientName}</div>
                <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.projectTitle}</div>
                <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 font-semibold text-primary group-hover:bg-row-hover">{formatAmount(invoice.totalAmount)}</div>
                <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                  <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">{invoice.status}</span>
                </div>
                <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(invoice.createdAt)}</div>
                <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                  <RestoreInvoiceButton invoiceId={invoice.id} />
                </div>
              </div>
            ))}
          </LazyRevealRows>
        </div>
      </ListNavigator>
    </div>
  );
}
