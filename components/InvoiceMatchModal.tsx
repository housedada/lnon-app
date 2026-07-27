'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { confirmInvoiceMatchesAction, type InvoiceMatchSuggestion } from '@/lib/actions/fic';
import { notify } from '@/lib/notify';

function formatAmount(value?: number): string {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString('it-IT') : '—';
}

export default function InvoiceMatchModal({
  suggestions,
  onClose,
}: {
  suggestions: InvoiceMatchSuggestion[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.map((s) => s.invoiceId)));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(invoiceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) next.delete(invoiceId);
      else next.add(invoiceId);
      return next;
    });
  }

  function handleConfirm() {
    const pairs = suggestions.filter((s) => selected.has(s.invoiceId)).map((s) => ({ invoiceId: s.invoiceId, ficId: s.ficId }));
    startTransition(async () => {
      const count = await confirmInvoiceMatchesAction(pairs);
      notify(`${count} fatture collegate per corrispondenza cliente/importo/data.`);
      router.refresh();
      onClose();
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-match-modal-title"
        className="modal-panel card-shadow max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-grid-border bg-card-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="invoice-match-modal-title" className="text-base font-semibold text-primary">
              Verifica abbinamenti fattura
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Queste fatture non hanno trovato corrispondenza per numero, ma cliente, importo e data coincidono con un
              unico documento su Fatture in Cloud. Controlla e conferma solo quelli corretti.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <ul className="mt-5 divide-y divide-grid-border rounded-lg border border-grid-border">
          {suggestions.map((s) => (
            <li key={s.invoiceId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={selected.has(s.invoiceId)}
                onChange={() => toggle(s.invoiceId)}
                aria-label={`Abbina fattura di ${s.clientName}`}
              />
              <span className="min-w-0 flex-1 truncate text-primary">
                {s.clientName} · {formatAmount(s.localAmount)} · {formatDate(s.localDate)}
              </span>
              <ArrowRight size={14} strokeWidth={1.75} className="shrink-0 text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-secondary">
                N. {s.ficNumber ?? '—'} · {formatAmount(s.ficAmount)} · {formatDate(s.ficDate)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || selected.size === 0}
            className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
            {isPending ? 'Collegamento...' : `Conferma ${selected.size} abbinamenti`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
