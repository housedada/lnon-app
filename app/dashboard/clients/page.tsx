import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getClients, getFicConnection } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { deleteClientAction } from '@/lib/actions/clients';

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

  const ficBadge = (status: 'not_synced' | 'synced' | 'orphaned') => {
    if (status === 'synced') {
      return <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sincronizzato</span>;
    }
    if (status === 'orphaned') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
          <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
          Orfano da FiC
        </span>
      );
    }
    return <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">Non sincronizzato</span>;
  };

  return (
    <div>
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

      <form className="px-6 pt-6" method="get">
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

      <div
        className={`mx-6 mt-6 grid gap-x-[2px] border-t border-grid-border text-xs ${
          ficConnection ? 'grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_2fr_1fr_1fr_1fr_auto]'
        }`}
      >
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Nome</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Email</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Telefono</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Città</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">P.IVA</div>
        {ficConnection && (
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Fatture in Cloud</div>
        )}
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Azioni</div>

        {clients.length === 0 && (
          <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
            Nessun cliente trovato{q ? ` per “${q}”` : ''}.
          </div>
        )}

        {clients.map((client) => (
          <div key={client.id} className="group contents">
            <div className="flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{client.name}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">{client.email ?? '—'}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">{client.phone ?? '—'}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">{client.city ?? '—'}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">{client.taxId ?? '—'}</div>
            {ficConnection && (
              <div className="flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                {ficBadge(client.ficSyncStatus)}
              </div>
            )}
            <div className="flex items-center gap-3 border-b border-grid-border px-3 py-2 whitespace-nowrap group-hover:bg-row-hover">
              {ficConnection && canUpdate && client.ficSyncStatus !== 'synced' && (
                <Link
                  href={`/dashboard/clients/${client.id}/sync-fic`}
                  aria-label="Sincronizza con Fatture in Cloud"
                  className="text-secondary transition hover:text-primary"
                >
                  <RefreshCw size={15} strokeWidth={1.75} />
                </Link>
              )}
              {canUpdate && (
                <Link
                  href={`/dashboard/clients/${client.id}/edit`}
                  aria-label="Modifica cliente"
                  className="text-secondary transition hover:text-primary"
                >
                  <Pencil size={15} strokeWidth={1.75} />
                </Link>
              )}
              {canDelete && (
                <form action={deleteClientAction.bind(null, client.id)} className="inline">
                  <button type="submit" aria-label="Elimina cliente" className="relative top-[2px] text-red-600/70 transition hover:text-red-600">
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </form>
              )}
              {!canUpdate && !canDelete && <span className="text-muted">—</span>}
            </div>
          </div>
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
