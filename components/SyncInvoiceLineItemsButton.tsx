'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PackageSearch, Loader2 } from 'lucide-react';
import { syncInvoiceLineItemsFromFicAction } from '@/lib/actions/fic';
import { notify } from '@/lib/notify';

export default function SyncInvoiceLineItemsButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await syncInvoiceLineItemsFromFicAction();
      notify(`Sottovoci sincronizzate: ${res.synced} fatture, ${res.errors} errori.`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Sincronizza sottovoci fatture da Fatture in Cloud"
      title="Sincronizza sottovoci fatture da Fatture in Cloud"
      className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
      ) : (
        <PackageSearch size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
      Sincronizza sottovoci da FIC
    </button>
  );
}
