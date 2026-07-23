'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import { restoreJobAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';

export default function RestoreJobButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await restoreJobAction(jobId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Ripristina lavoro"
      title="Ripristina lavoro"
      className="text-secondary transition hover:text-primary disabled:opacity-60"
    >
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
