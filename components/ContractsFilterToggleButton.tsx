'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useContractsFilterStore } from '@/lib/store/contractsFilterStore';

export default function ContractsFilterToggleButton() {
  const visible = useContractsFilterStore((s) => s.visible);
  const toggle = useContractsFilterStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Mostra/nascondi filtri contratti"
      aria-pressed={visible}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
        visible
          ? 'border-[var(--accent-to)] bg-[var(--accent-to)]/10 text-[var(--accent-to)]'
          : 'border-grid-border text-secondary hover:bg-row-hover hover:text-primary'
      }`}
    >
      <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
