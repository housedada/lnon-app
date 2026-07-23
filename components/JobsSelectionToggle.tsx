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
      aria-label="Selezione multipla"
      aria-pressed={mode}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
        mode ? 'bg-violet-500/15 text-violet-400' : 'text-violet-400/80 hover:bg-neutral-800 hover:text-violet-400'
      }`}
    >
      <ListChecks size={17} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
