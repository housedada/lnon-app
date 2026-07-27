'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useInvoicesFilterStore } from '@/lib/store/invoicesFilterStore';
import { useListPendingStore } from '@/lib/store/listPendingStore';
import AnimatedVisibility from '@/components/AnimatedVisibility';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'da_fatturare', label: 'Da fatturare' },
  { value: 'fatturata', label: 'Fatturata' },
  { value: 'annullata', label: 'Annullata' },
  { value: 'accorpata', label: 'Accorpata' },
];

const SYNC_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutti' },
  { value: 'not_linked', label: 'Non collegata a FIC' },
  { value: 'not_synced', label: 'Non sincronizzato' },
  { value: 'synced', label: 'Sincronizzato' },
];

export default function InvoicesFilterWidget() {
  const visible = useInvoicesFilterStore((s) => s.visible);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const setListPending = useListPendingStore((s) => s.setPending);

  const status = searchParams.get('status') ?? '';
  const syncState = searchParams.get('syncState') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');

    const query = params.toString();
    setListPending(true);
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return (
    <AnimatedVisibility visible={visible}>
      <div className="mx-6 mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          aria-label="Filtra per stato fattura"
          className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={syncState}
          onChange={(e) => updateParam('syncState', e.target.value)}
          aria-label="Filtra per stato sincronizzazione sottovoci"
          className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
        >
          {SYNC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </AnimatedVisibility>
  );
}
