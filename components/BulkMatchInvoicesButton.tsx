'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { bulkMatchInvoicesAction, suggestInvoiceMatchesAction, type InvoiceMatchSuggestion } from '@/lib/actions/fic';
import { notify } from '@/lib/notify';
import InvoiceMatchModal from '@/components/InvoiceMatchModal';

export default function BulkMatchInvoicesButton() {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<InvoiceMatchSuggestion[] | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await bulkMatchInvoicesAction();
      notify(`Sync: ${res.matched} collegate, ${res.uncertain} da verificare, ${res.unmatched} senza corrispondenza.`);
      router.refresh();

      const invoiceSuggestions = await suggestInvoiceMatchesAction();
      if (invoiceSuggestions.length > 0) {
        setSuggestions(invoiceSuggestions);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Sincronizza fatture storiche (match automatico con Fatture in Cloud)"
        title="Sincronizza fatture storiche (match automatico con Fatture in Cloud)"
        className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
        Sincronizza fatture
      </button>

      {suggestions && <InvoiceMatchModal suggestions={suggestions} onClose={() => setSuggestions(null)} />}
    </>
  );
}
