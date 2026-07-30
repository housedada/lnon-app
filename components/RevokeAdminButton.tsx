'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus, Loader2 } from 'lucide-react';
import { revokeAdminAction } from '@/lib/actions/access';
import { notify } from '@/lib/notify';

export default function RevokeAdminButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await revokeAdminAction(userId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Rimuovi permessi amministrativi"
      title="Rimuovi permessi"
      className="text-secondary transition hover:text-red-600 disabled:opacity-60"
    >
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <UserMinus size={15} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
