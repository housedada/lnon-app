'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Clock } from 'lucide-react';

export default function JobsSystemGeneratedToggle({ active }: { active: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete('system');
    else params.set('system', '1');
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      title={active ? 'Mostra lavori normali' : 'Mostra lavori generati da conteggio orario'}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
        active
          ? 'border-[var(--accent-to)] bg-[var(--accent-to)]/10 text-[var(--accent-to)]'
          : 'border-grid-border text-secondary hover:bg-row-hover hover:text-primary'
      }`}
    >
      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
