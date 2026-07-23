'use client';

import { ListChecks } from 'lucide-react';
import { useJobsSelectionStore } from '@/lib/store/jobsSelectionStore';

export default function JobsSelectionToggle() {
  const mode = useJobsSelectionStore((s) => s.mode);
  const toggleMode = useJobsSelectionStore((s) => s.toggleMode);

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label="Attiva/disattiva selezione multipla"
      aria-pressed={mode}
      title="Selezione multipla"
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition ${
        mode ? 'border-violet-500/40 bg-violet-500/10 text-violet-700' : 'border-grid-border text-secondary hover:bg-row-hover hover:text-primary'
      }`}
    >
      <ListChecks size={15} strokeWidth={1.75} aria-hidden="true" />
      Seleziona
    </button>
  );
}
