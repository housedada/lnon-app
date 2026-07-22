'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link2 } from 'lucide-react';
import { searchFicClientsAction } from '@/lib/actions/fic';
import type { FicClientSummary } from '@/lib/types';

export default function FicClientSearch({
  linkAction,
}: {
  linkAction: (ficId: number) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FicClientSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = await searchFicClientsAction(query);
      setResults(data);
      setSearched(true);
    });
  }

  function handleLink(ficId: number) {
    startTransition(async () => {
      await linkAction(ficId);
      router.push('/dashboard/clients');
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <form onSubmit={handleSearch} className="relative max-w-sm">
        <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, P.IVA, codice fiscale..."
          className="w-full rounded-lg border border-grid-border bg-card-bg py-2 pl-9 pr-3 text-sm text-primary"
        />
      </form>

      {isPending && <p className="mt-3 text-xs text-secondary">Ricerca in corso...</p>}

      {!isPending && searched && results.length === 0 && (
        <p className="mt-3 text-xs text-secondary">Nessun cliente trovato su Fatture in Cloud.</p>
      )}

      {!isPending && results.length > 0 && (
        <ul className="mt-3 divide-y divide-grid-border rounded-lg border border-grid-border">
          {results.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-primary">{r.name}</p>
                <p className="text-xs text-secondary">{r.vatNumber ?? r.taxCode ?? r.email ?? `#${r.id}`}</p>
              </div>
              <button
                type="button"
                onClick={() => handleLink(r.id)}
                className="flex items-center gap-1.5 rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover"
              >
                <Link2 size={13} strokeWidth={1.75} aria-hidden="true" />
                Collega
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
