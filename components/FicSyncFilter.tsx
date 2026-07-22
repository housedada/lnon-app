'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'synced', label: 'Sync' },
  { value: 'not_synced', label: 'No Sync' },
  { value: 'orphaned', label: 'Orfano' },
];

export default function FicSyncFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('sync') ?? '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      next.set('sync', e.target.value);
    } else {
      next.delete('sync');
    }
    next.delete('page');
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="Filtra per stato sincronizzazione FIC"
      className="rounded-lg border border-grid-border bg-card-bg py-2 px-3 text-sm text-primary"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
