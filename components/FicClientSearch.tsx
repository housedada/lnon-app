'use client';

import { searchFicClientsAction } from '@/lib/actions/fic';
import FicEntitySearch from '@/components/FicEntitySearch';

export default function FicClientSearch({ linkAction }: { linkAction: (ficId: number) => Promise<void> }) {
  return (
    <FicEntitySearch
      placeholder="Nome, P.IVA, codice fiscale..."
      redirectTo="/dashboard/clients"
      linkAction={linkAction}
      searchAction={async (query) => {
        const results = await searchFicClientsAction(query);
        return results.map((r) => ({ id: r.id, name: r.name, subtitle: r.vatNumber ?? r.taxCode ?? r.email ?? `#${r.id}` }));
      }}
    />
  );
}
