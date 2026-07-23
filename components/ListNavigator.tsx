'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const SYNC_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'synced', label: 'Sync' },
  { value: 'not_synced', label: 'No Sync' },
  { value: 'orphaned', label: 'Orfano' },
];

export default function ListNavigator({
  basePath,
  searchPlaceholder,
  q,
  sync,
  currentPage,
  totalPages,
  showSyncFilter,
  totalCount,
  totalLabel,
  children,
}: {
  basePath: string;
  searchPlaceholder: string;
  q?: string;
  sync?: string;
  currentPage: number;
  totalPages: number;
  showSyncFilter: boolean;
  totalCount?: number;
  totalLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(q ?? '');

  // Riparte sempre dai searchParams correnti per non perdere eventuali filtri
  // extra gestiti da altri componenti sulla stessa pagina (es. ContractsFilterWidget).
  function navigate(next: { q?: string; page?: number; sync?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = next.q !== undefined ? next.q : q;
    const nextSync = next.sync !== undefined ? next.sync : sync;
    const nextPage = next.page ?? 1;

    if (nextQ) params.set('q', nextQ);
    else params.delete('q');

    if (nextSync) params.set('sync', nextSync);
    else params.delete('sync');

    if (nextPage > 1) params.set('page', String(nextPage));
    else params.delete('page');

    const target = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    startTransition(() => {
      router.push(target, { scroll: false });
    });
  }

  const paginationControls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate({ page: currentPage - 1 })}
        disabled={currentPage <= 1}
        aria-label="Pagina precedente"
        className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => navigate({ page: currentPage + 1 })}
        disabled={currentPage >= totalPages}
        aria-label="Pagina successiva"
        className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 px-6 pt-6">
        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ q: query, page: 1 });
            }}
          >
            <div className="relative max-w-sm">
              <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-grid-border bg-card-bg py-2 pl-9 pr-3 text-[12px] text-primary"
              />
            </div>
          </form>

          {totalCount !== undefined && (
            <span className="text-[11px] text-secondary whitespace-nowrap">
              <strong className="font-bold text-primary">{totalCount}</strong> {totalLabel} totali
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[9px] text-secondary whitespace-nowrap">
            Pagina {currentPage} di {totalPages}
          </span>
          {paginationControls}
          {showSyncFilter && (
            <select
              value={sync ?? ''}
              onChange={(e) => navigate({ sync: e.target.value, page: 1 })}
              aria-label="Filtra per stato sincronizzazione FIC"
              className="ml-3 rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
            >
              {SYNC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="list-fade-in relative">
        {children}
        {isPending && (
          <div
            className="absolute inset-0 z-10 flex items-start justify-center pt-16"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
          >
            <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-secondary" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 p-6 text-sm">
        <span className="text-[9px] text-secondary whitespace-nowrap">
          Pagina {currentPage} di {totalPages}
        </span>
        {paginationControls}
      </div>
    </>
  );
}
