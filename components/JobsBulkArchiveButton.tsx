'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2 } from 'lucide-react';
import { useJobsSelectionStore } from '@/lib/store/jobsSelectionStore';
import { archiveJobsAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';

export default function JobsBulkArchiveButton() {
  const selected = useJobsSelectionStore((s) => s.selected);
  const clear = useJobsSelectionStore((s) => s.clear);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (selected.length === 0) return null;

  function handleClick() {
    startTransition(async () => {
      const res = await archiveJobsAction(selected);
      notify(res.message);
      if (res.success) {
        clear();
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn-accent flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
    >
      {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <Archive size={14} strokeWidth={1.75} aria-hidden="true" />}
      Archivia selezionati ({selected.length})
    </button>
  );
}
