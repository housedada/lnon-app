import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getClients } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { deleteClientAction } from '@/lib/actions/clients';

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'clients', 'create');
  const canUpdate = hasPermission(role, 'clients', 'update');
  const canDelete = canDeleteResource(role, '', '', 'clients');

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
            className="rounded-md bg-button-bg px-4 py-2 text-sm font-medium text-button-text hover:bg-button-bg-hover"
          >
            Nuovo Cliente
          </Link>
        )}
      </div>

      <form className="px-6 pt-6" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Cerca per nome, email..."
          className="w-full max-w-sm rounded-md border border-grid-border bg-card-bg px-3 py-2 text-sm text-primary"
        />
      </form>

      <div className="mt-6 grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] border-t border-l border-grid-border text-xs">
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">Nome</div>
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">Email</div>
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">Telefono</div>
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">Città</div>
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">P.IVA</div>
        <div className="border-r border-b border-grid-border bg-grid-header-bg p-3 font-semibold uppercase tracking-wide text-secondary">Azioni</div>

        {clients.map((client) => (
          <div key={client.id} className="group contents">
            <div className="border-r border-b border-grid-border p-3 font-medium text-primary group-hover:bg-row-hover">{client.name}</div>
            <div className="border-r border-b border-grid-border p-3 text-secondary group-hover:bg-row-hover">{client.email ?? '—'}</div>
            <div className="border-r border-b border-grid-border p-3 text-secondary group-hover:bg-row-hover">{client.phone ?? '—'}</div>
            <div className="border-r border-b border-grid-border p-3 text-secondary group-hover:bg-row-hover">{client.city ?? '—'}</div>
            <div className="border-r border-b border-grid-border p-3 text-secondary group-hover:bg-row-hover">{client.taxId ?? '—'}</div>
            <div className="border-r border-b border-grid-border p-3 whitespace-nowrap group-hover:bg-row-hover">
              {canUpdate && (
                <Link href={`/dashboard/clients/${client.id}/edit`} className="text-primary underline">
                  Modifica
                </Link>
              )}
              {canUpdate && canDelete && <span className="mx-2 text-muted">|</span>}
              {canDelete && (
                <form action={deleteClientAction.bind(null, client.id)} className="inline">
                  <button type="submit" className="text-red-600 underline">
                    Elimina
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
        <div className="flex gap-3">
          {currentPage > 1 && (
            <Link
              href={`/dashboard/clients?q=${encodeURIComponent(q ?? '')}&page=${currentPage - 1}`}
              className="text-primary underline"
            >
              Precedente
            </Link>
          )}
          {currentPage < totalPages && (
            <Link
              href={`/dashboard/clients?q=${encodeURIComponent(q ?? '')}&page=${currentPage + 1}`}
              className="text-primary underline"
            >
              Successiva
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
