'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, Loader2 } from 'lucide-react';
import { revokeSuperadminAction } from '@/lib/actions/access';
import { notify } from '@/lib/notify';

export default function RevokeAccessButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await revokeSuperadminAction(userId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs font-medium text-red-600/80 transition hover:text-red-600 disabled:opacity-60"
    >
      {isPending ? <Loader2 size={13} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <ShieldOff size={13} strokeWidth={1.75} aria-hidden="true" />}
      Revoca
    </button>
  );
}
