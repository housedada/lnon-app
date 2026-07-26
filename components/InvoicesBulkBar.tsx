'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Combine, FileOutput, Loader2 } from 'lucide-react';
import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';
import { archiveProjectInvoicesAction, mergeProjectInvoicesAction, generateFicInvoicesBulkAction } from '@/lib/actions/projectInvoices';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { notify } from '@/lib/notify';
import type { ProjectInvoiceStatus } from '@/lib/types';

export default function InvoicesBulkBar({
  invoiceGroupKeys,
  invoiceStatuses,
}: {
  invoiceGroupKeys: Record<string, string>;
  invoiceStatuses: Record<string, { status: ProjectInvoiceStatus; ficInvoiceId?: number }>;
}) {
  const selected = useProjectInvoicesSelectionStore((s) => s.selected);
  const clear = useProjectInvoicesSelectionStore((s) => s.clear);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [ficConfirmOpen, setFicConfirmOpen] = useState(false);

  if (selected.length === 0) return null;

  const groupKeysInSelection = new Set(selected.map((id) => invoiceGroupKeys[id]).filter(Boolean));
  const canMerge = selected.length >= 2 && groupKeysInSelection.size === 1;
  const canGenerateFic =
    selected.length >= 1 &&
    selected.every((id) => invoiceStatuses[id]?.status === 'da_fatturare' && !invoiceStatuses[id]?.ficInvoiceId);

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

  function handleGenerateFic() {
    startTransition(async () => {
      const res = await generateFicInvoicesBulkAction(selected);
      notify(res.message);
      if (res.success) {
        clear();
        router.refresh();
      }
      setFicConfirmOpen(false);
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
      {canGenerateFic && (
        <button
          type="button"
          onClick={() => setFicConfirmOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <FileOutput size={14} strokeWidth={1.75} aria-hidden="true" />}
          Genera su FIC ({selected.length})
        </button>
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
      {ficConfirmOpen && (
        <DoubleConfirmModal
          title="Genera fatture su Fatture in Cloud"
          firstMessage={`Verranno create ${selected.length} fatture definitive e numerate su Fatture in Cloud (non è possibile crearle come bozza). Procedere?`}
          secondMessage="Confermi in modo definitivo? L'operazione non è annullabile da LNON."
          confirmLabel="Genera su FIC"
          onConfirm={handleGenerateFic}
          onClose={() => setFicConfirmOpen(false)}
        />
      )}
    </div>
  );
}
