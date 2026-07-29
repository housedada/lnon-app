'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { JobCategory } from '@/lib/types';

const OPTIONS: { value: JobCategory; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'web', label: 'Contratti Web' },
  { value: 'hourly', label: 'Conteggio Orario' },
];

export default function JobsCategoryTabs({ active }: { active: JobCategory }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectCategory(value: JobCategory) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'standard') params.delete('category');
    else params.set('category', value);
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Categoria lavori">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => selectCategory(opt.value)}
          aria-pressed={active === opt.value}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            active === opt.value
              ? 'border-transparent bg-grid-header-bg text-primary'
              : 'border-grid-border text-secondary hover:bg-row-hover'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
