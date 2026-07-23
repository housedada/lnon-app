import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getProducts, getFicConnection, getAllProductNames } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { buildProductColorMap } from '@/lib/productColors';
import ImportFicProductsButton from '@/components/ImportFicProductsButton';
import NewProductButton from '@/components/NewProductButton';
import ProductRow from '@/components/ProductRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';

export const metadata = { title: 'Prodotti' };

const PAGE_SIZE = 25;

type SearchParams = { q?: string; page?: string; sync?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const ficConnection = await getFicConnection();

  const canCreate = hasPermission(role, 'products', 'create');
  const canUpdate = hasPermission(role, 'products', 'update');
  const canDelete = canDeleteResource(role, '', '', 'products');
  const isSuperadmin = role === 'superadmin';

  return (
    <div>
      <NotifyFromQuery param="saved" message="Prodotto salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Prodotti</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && <NewProductButton />}
          {ficConnection && isSuperadmin && <ImportFicProductsButton />}
        </div>
      </div>

      <Suspense fallback={<ListPlaceholder />}>
        <ProductsListSection
          params={params}
          ficConnection={Boolean(ficConnection)}
          canUpdate={canUpdate}
          canDelete={canDelete}
          isSuperadmin={isSuperadmin}
        />
      </Suspense>
    </div>
  );
}

async function ProductsListSection({
  params,
  ficConnection,
  canUpdate,
  canDelete,
  isSuperadmin,
}: {
  params: SearchParams;
  ficConnection: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
}) {
  const { q, page, sync } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [{ data: products, total }, allProductNames] = await Promise.all([
    getProducts({ search: q, ficSyncStatus: sync, limit: PAGE_SIZE, offset }),
    getAllProductNames(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const colorMap = buildProductColorMap(allProductNames);

  const gridCols = ficConnection
    ? '40px repeat(4, minmax(max-content, 1fr)) max-content'
    : '40px repeat(3, minmax(max-content, 1fr)) max-content';

  return (
    <ListNavigator
      basePath="/dashboard/settings/products"
      searchPlaceholder="Cerca per nome o codice..."
      q={q}
      sync={sync}
      currentPage={currentPage}
      totalPages={totalPages}
      showSyncFilter={ficConnection}
      totalCount={total}
      totalLabel="prodotti"
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: gridCols }}>
          <div className="list-cell-deco border-b border-grid-border bg-grid-header-bg" />
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Nome</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Codice</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Prezzo netto</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">IVA</div>
          {ficConnection && (
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">FIC</div>
          )}
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {products.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun prodotto trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              color={colorMap.get(product.id) ?? '#e5e5e5'}
              ficConnection={ficConnection}
              canUpdate={canUpdate}
              canDelete={canDelete}
              isSuperadmin={isSuperadmin}
            />
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
