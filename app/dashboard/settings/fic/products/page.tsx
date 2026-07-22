import Link from 'next/link';
import { Plus, Pencil, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getProducts, getFicConnection } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ImportFicProductsButton from '@/components/ImportFicProductsButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import ListNavigator from '@/components/ListNavigator';

export const metadata = { title: 'Prodotti' };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sync?: string }>;
}) {
  const { q, page, sync } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const { data: products, total } = await getProducts({ search: q, ficSyncStatus: sync, limit: PAGE_SIZE, offset });
  const ficConnection = await getFicConnection();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'products', 'create');
  const canUpdate = hasPermission(role, 'products', 'update');
  const isSuperadmin = role === 'superadmin';

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
      <NotifyFromQuery param="saved" message="Prodotto salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Prodotti</h1>
          <p className="mt-1 text-sm text-secondary">{total} prodotti totali</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Link
              href="/dashboard/settings/fic/products/new"
              className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nuovo Prodotto
            </Link>
          )}
          {ficConnection && isSuperadmin && <ImportFicProductsButton />}
        </div>
      </div>

      <ListNavigator
        basePath="/dashboard/settings/fic/products"
        searchPlaceholder="Cerca per nome o codice..."
        q={q}
        sync={sync}
        currentPage={currentPage}
        totalPages={totalPages}
        showSyncFilter={Boolean(ficConnection)}
      >
        <div
          className={`mx-6 mt-6 grid gap-x-[2px] border-t border-grid-border text-[10px] ${
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
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary" />

          {products.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun prodotto trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {products.map((product) => (
            <div key={product.id} className="group contents">
              <div className="flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{product.name}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">{product.code ?? '—'}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">
                {product.netPrice != null ? `€ ${product.netPrice.toFixed(2)}` : '—'}
              </div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">
                {product.defaultVatRate != null ? `${product.defaultVatRate}%` : '—'}
              </div>
              {ficConnection && (
                <div className="flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                  {ficBadge(product.ficSyncStatus)}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 border-b border-grid-border px-3 py-2 whitespace-nowrap group-hover:bg-row-hover">
                {ficConnection && isSuperadmin && product.ficSyncStatus !== 'synced' && (
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
                {!canUpdate && <span className="text-muted">—</span>}
              </div>
            </div>
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
