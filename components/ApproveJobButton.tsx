'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { approveJobAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';

export default function ApproveJobButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await approveJobAction(jobId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Approva lavoro"
      title="Approva lavoro"
      className="text-secondary transition hover:text-green-600 disabled:opacity-60"
    >
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={15} strokeWidth={1.75} />}
    </button>
  );
}
