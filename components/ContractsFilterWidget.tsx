'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useContractsFilterStore } from '@/lib/store/contractsFilterStore';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'maintenance', label: 'Manutenzione WP' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'analytics', label: 'Analytics e GDPR' },
  { value: 'cookie', label: 'Cookie (Complianz)' },
];

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'attivo', label: 'Attivo' },
  { value: 'da_definire', label: 'Da definire' },
  { value: 'disattivo', label: 'Disattivo' },
];

export default function ContractsFilterWidget() {
  const visible = useContractsFilterStore((s) => s.visible);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeCategories = searchParams.get('categories')?.split(',').filter(Boolean) ?? [];
  const activeStatus = searchParams.get('status') ?? '';

  function updateParams(next: { categories?: string[]; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    if (next.categories !== undefined) {
      if (next.categories.length) params.set('categories', next.categories.join(','));
      else params.delete('categories');
    }
    if (next.status !== undefined) {
      if (next.status) params.set('status', next.status);
      else params.delete('status');
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function toggleCategory(value: string) {
    const next = activeCategories.includes(value)
      ? activeCategories.filter((c) => c !== value)
      : [...activeCategories, value];
    updateParams({ categories: next });
  }

  if (!visible) return null;

  return (
    <div className="mx-6 mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const active = activeCategories.includes(cat.value);
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggleCategory(cat.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'border-amber-500 bg-amber-500/20 text-amber-700'
                  : 'border-grid-border text-secondary hover:bg-row-hover'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <select
        value={activeStatus}
        onChange={(e) => updateParams({ status: e.target.value })}
        aria-label="Filtra per stato contratto"
        className="rounded-lg border border-grid-border bg-card-bg py-1.5 px-3 text-[12px] text-primary"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {isPending && <Loader2 size={15} strokeWidth={1.75} className="animate-spin text-secondary" aria-hidden="true" />}
    </div>
  );
}
