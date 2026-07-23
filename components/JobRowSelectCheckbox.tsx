'use client';

import { useJobsSelectionStore } from '@/lib/store/jobsSelectionStore';

export default function JobRowSelectCheckbox({ jobId }: { jobId: string }) {
  const mode = useJobsSelectionStore((s) => s.mode);
  const checked = useJobsSelectionStore((s) => s.selected.includes(jobId));
  const toggleSelect = useJobsSelectionStore((s) => s.toggleSelect);

  if (!mode) return null;

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => toggleSelect(jobId)}
      aria-label="Seleziona lavoro"
    />
  );
}
