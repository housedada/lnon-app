'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { JobStatus } from '@/lib/types';
import { useJobsFilterStore } from '@/lib/store/jobsFilterStore';

const STATUS_OPTIONS: { value: JobStatus | ''; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'draft', label: 'Bozza' },
  { value: 'pending_approval', label: 'In attesa di approvazione' },
  { value: 'approved', label: 'Approvato' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'completed', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
];

const SYNC_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutti' },
  { value: 'synced', label: 'Sync' },
  { value: 'not_synced', label: 'No Sync' },
];

export default function JobsFilterBar({ clientOptions }: { clientOptions: { id: string; name: string }[] }) {
  const visible = useJobsFilterStore((s) => s.visible);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const clientId = searchParams.get('clientId') ?? '';
  const sync = searchParams.get('sync') ?? '';
  const status = searchParams.get('status') ?? '';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  if (!visible) return null;

  return (
    <div className="mx-6 mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <select
        value={clientId}
        onChange={(e) => updateParam('clientId', e.target.value)}
        aria-label="Filtra per cliente"
        className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
      >
        <option value="">Tutti i clienti</option>
        {clientOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={sync}
        onChange={(e) => updateParam('sync', e.target.value)}
        aria-label="Filtra per stato sincronizzazione cliente"
        className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
      >
        {SYNC_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => updateParam('status', e.target.value)}
        aria-label="Filtra per stato lavoro"
        className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-[12px] text-primary"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {isPending && <Loader2 size={15} strokeWidth={1.75} className="animate-spin text-secondary" aria-hidden="true" />}
    </div>
  );
}
