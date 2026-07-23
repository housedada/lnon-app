'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2 } from 'lucide-react';
import { archiveJobAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';

export default function ArchiveJobButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await archiveJobAction(jobId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary disabled:opacity-60"
    >
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <Archive size={15} strokeWidth={1.75} aria-hidden="true" />}
      Archivia lavoro
    </button>
  );
}
