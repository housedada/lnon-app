'use client';

import { searchFicProductsAction } from '@/lib/actions/fic';
import FicEntitySearch from '@/components/FicEntitySearch';

export default function FicProductSearch({ linkAction }: { linkAction: (ficId: number) => Promise<void> }) {
  return (
    <FicEntitySearch
      placeholder="Nome o codice prodotto..."
      redirectTo="/dashboard/settings/fic/products"
      linkAction={linkAction}
      searchAction={async (query) => {
        const results = await searchFicProductsAction(query);
        return results.map((r) => ({ id: r.id, name: r.name, subtitle: r.code ?? `#${r.id}` }));
      }}
    />
  );
}
