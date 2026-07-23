'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { unarchiveProjectInvoiceAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';

export default function UnarchiveInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await unarchiveProjectInvoiceAction(invoiceId);
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
      {isPending ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" /> : <ArchiveRestore size={15} strokeWidth={1.75} />}
    </button>
  );
}
