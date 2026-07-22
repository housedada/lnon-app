import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getProducts, getFicConnection } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { deleteProductAction } from '@/lib/actions/products';
import ImportFicProductsButton from '@/components/ImportFicProductsButton';

export const metadata = { title: 'Prodotti' };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const { data: products, total } = await getProducts({ search: q, limit: PAGE_SIZE, offset });
  const ficConnection = await getFicConnection();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'products', 'create');
  const canUpdate = hasPermission(role, 'products', 'update');
  const canDelete = canDeleteResource(role, '', '', 'products');

  const ficBadge = (status: 'not_synced' | 'synced' | 'orphaned') => {
    if (status === 'synced') {
      return <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>;
    }
    if (status === 'orphaned') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
          <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
          Orfano
        </span>
      );
    }
    return <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Prodotti</h1>
          <p className="mt-1 text-sm text-secondary">{total} prodotti totali</p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/settings/fic/products/new"
            className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nuovo Prodotto
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
              placeholder="Cerca per nome o codice..."
              className="w-full rounded-lg border border-grid-border bg-card-bg py-2 pl-9 pr-3 text-sm text-primary"
            />
          </div>
        </form>
        {ficConnection && canUpdate && <ImportFicProductsButton />}
      </div>

      <div
        className={`mx-6 mt-6 grid gap-x-[2px] border-t border-grid-border text-xs ${
          ficConnection ? 'grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]' : 'grid-cols-[2fr_1fr_1fr_1fr_auto]'
        }`}
      >
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Nome</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Codice</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Prezzo netto</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">IVA</div>
        {ficConnection && (
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">FIC</div>
        )}
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Azioni</div>

        {products.length === 0 && (
          <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
            Nessun prodotto trovato{q ? ` per “${q}”` : ''}.
          </div>
        )}

        {products.map((product) => (
          <div key={product.id} className="group contents">
            <div className="flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{product.name}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">{product.code ?? '—'}</div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">
              {product.netPrice != null ? `€ ${product.netPrice.toFixed(2)}` : '—'}
            </div>
            <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover">
              {product.defaultVatRate != null ? `${product.defaultVatRate}%` : '—'}
            </div>
            {ficConnection && (
              <div className="flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                {ficBadge(product.ficSyncStatus)}
              </div>
            )}
            <div className="flex items-center gap-3 border-b border-grid-border px-3 py-2 whitespace-nowrap group-hover:bg-row-hover">
              {ficConnection && canUpdate && product.ficSyncStatus !== 'synced' && (
                <Link
                  href={`/dashboard/settings/fic/products/${product.id}/sync-fic`}
                  aria-label="Sincronizza con Fatture in Cloud"
                  className="text-secondary transition hover:text-primary"
                >
                  <RefreshCw size={15} strokeWidth={1.75} />
                </Link>
              )}
              {canUpdate && (
                <Link
                  href={`/dashboard/settings/fic/products/${product.id}/edit`}
                  aria-label="Modifica prodotto"
                  className="text-secondary transition hover:text-primary"
                >
                  <Pencil size={15} strokeWidth={1.75} />
                </Link>
              )}
              {canDelete && (
                <form action={deleteProductAction.bind(null, product.id)} className="inline">
                  <button type="submit" aria-label="Elimina prodotto" className="relative top-[2px] text-red-600/70 transition hover:text-red-600">
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
              href={`/dashboard/settings/fic/products?q=${encodeURIComponent(q ?? '')}&page=${currentPage - 1}`}
              aria-label="Pagina precedente"
              className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
            >
              <ChevronLeft size={16} strokeWidth={1.75} />
            </Link>
          ) : (
            <span aria-hidden="true" className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted">
              <ChevronLeft size={16} strokeWidth={1.75} />
            </span>
          )}
          {currentPage < totalPages ? (
            <Link
              href={`/dashboard/settings/fic/products?q=${encodeURIComponent(q ?? '')}&page=${currentPage + 1}`}
              aria-label="Pagina successiva"
              className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
            >
              <ChevronRight size={16} strokeWidth={1.75} />
            </Link>
          ) : (
            <span aria-hidden="true" className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted">
              <ChevronRight size={16} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
