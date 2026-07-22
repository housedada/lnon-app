import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getClients, getFicConnection } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import BulkMatchClientsButton from '@/components/BulkMatchClientsButton';
import ClientRow from '@/components/ClientRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';

export const metadata = { title: 'Clienti' };

const PAGE_SIZE = 25;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const { data: clients, total } = await getClients({
    search: q,
    limit: PAGE_SIZE,
    offset,
  });
  const ficConnection = await getFicConnection();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'clients', 'create');
  const canUpdate = hasPermission(role, 'clients', 'update');
  const canDelete = canDeleteResource(role, '', '', 'clients');

  return (
    <div>
      <NotifyFromQuery param="saved" message="Cliente salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Clienti</h1>
          <p className="mt-1 text-sm text-secondary">{total} clienti totali</p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/clients/new"
            className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nuovo Cliente
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <form method="get">
          <div className="relative max-w-sm">
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Cerca per nome, email..."
              className="w-full rounded-lg border border-grid-border bg-card-bg py-2 pl-9 pr-3 text-sm text-primary"
            />
          </div>
        </form>
        {ficConnection && canUpdate && <BulkMatchClientsButton />}
      </div>

      <div
        className={`mx-6 mt-6 grid gap-x-[2px] border-t border-grid-border text-xs ${
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
          />
        ))}
      </div>

      <div className="flex items-center justify-between p-6 text-sm">
        <span className="text-secondary">
          Pagina {currentPage} di {totalPages}
        </span>
        <div className="flex items-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={`/dashboard/clients?q=${encodeURIComponent(q ?? '')}&page=${currentPage - 1}`}
              aria-label="Pagina precedente"
              className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </span>
          )}
          {currentPage < totalPages ? (
            <Link
              href={`/dashboard/clients?q=${encodeURIComponent(q ?? '')}&page=${currentPage + 1}`}
              aria-label="Pagina successiva"
              className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
