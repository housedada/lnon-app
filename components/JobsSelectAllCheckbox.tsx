'use client';

import { useJobsSelectionStore } from '@/lib/store/jobsSelectionStore';

export default function JobsSelectAllCheckbox({ jobIds }: { jobIds: string[] }) {
  const selected = useJobsSelectionStore((s) => s.selected);
  const selectMany = useJobsSelectionStore((s) => s.selectMany);

  const allSelected = jobIds.length > 0 && jobIds.every((id) => selected.includes(id));

  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={() => selectMany(jobIds)}
      aria-label="Seleziona tutti i lavori"
    />
  );
}
