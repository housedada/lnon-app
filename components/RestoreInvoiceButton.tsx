'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Loader2 } from 'lucide-react';
import { restoreProjectInvoiceAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';

export default function RestoreInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await restoreProjectInvoiceAction(invoiceId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Ripristina fattura"
      title="Ripristina fattura"
      className="text-secondary transition hover:text-primary disabled:opacity-60"
    >
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
