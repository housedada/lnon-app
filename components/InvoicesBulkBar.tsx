'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Combine, Loader2 } from 'lucide-react';
import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';
import { archiveProjectInvoicesAction, mergeProjectInvoicesAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';

export default function InvoicesBulkBar({ invoiceGroupKeys }: { invoiceGroupKeys: Record<string, string> }) {
  const selected = useProjectInvoicesSelectionStore((s) => s.selected);
  const clear = useProjectInvoicesSelectionStore((s) => s.clear);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (selected.length === 0) return null;

  const groupKeysInSelection = new Set(selected.map((id) => invoiceGroupKeys[id]).filter(Boolean));
  const canMerge = selected.length >= 2 && groupKeysInSelection.size === 1;

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveProjectInvoicesAction(selected);
      notify(res.message);
      if (res.success) {
        clear();
        router.refresh();
      }
    });
  }

  function handleMerge() {
    startTransition(async () => {
      const res = await mergeProjectInvoicesAction(selected);
      notify(res.message);
      if (res.success) {
        clear();
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {canMerge && (
        <button
          type="button"
          onClick={handleMerge}
          disabled={isPending}
          title="Accorpa le fatture selezionate (stesso cliente) in un'unica fattura"
          className="btn-accent flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <Combine size={14} strokeWidth={1.75} aria-hidden="true" />}
          Accorpa fatture ({selected.length})
        </button>
      )}
      {selected.length >= 2 && !canMerge && (
        <span className="whitespace-nowrap text-[11px] text-secondary" title="Solo fatture dello stesso cliente possono essere accorpate">
          Clienti diversi: non accorpabili
        </span>
      )}
      <button
        type="button"
        onClick={handleArchive}
        disabled={isPending}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
      >
        {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <Archive size={14} strokeWidth={1.75} aria-hidden="true" />}
        Archivia selezionate ({selected.length})
      </button>
    </div>
  );
}
