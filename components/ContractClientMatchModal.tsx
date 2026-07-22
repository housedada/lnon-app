'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { confirmContractClientMatchesAction, type ContractClientMatchSuggestion } from '@/lib/actions/contracts';
import { notify } from '@/lib/notify';

export default function ContractClientMatchModal({
  suggestions,
  onClose,
}: {
  suggestions: ContractClientMatchSuggestion[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.map((s) => s.contractId)));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(contractId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  }

  function handleConfirm() {
    const pairs = suggestions
      .filter((s) => selected.has(s.contractId))
      .map((s) => ({ contractId: s.contractId, clientId: s.clientId }));
    startTransition(async () => {
      const count = await confirmContractClientMatchesAction(pairs);
      notify(`${count} contratti collegati al cliente corrispondente.`);
      router.refresh();
      onClose();
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-match-modal-title"
        className="modal-panel card-shadow max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-grid-border bg-card-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="contract-match-modal-title" className="text-base font-semibold text-primary">
              Verifica abbinamenti contratto → cliente
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Il nome cliente indicato nel contratto corrisponde esattamente a un cliente in anagrafica. Controlla e
              conferma solo quelli corretti.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <ul className="mt-5 divide-y divide-grid-border rounded-lg border border-grid-border">
          {suggestions.map((s) => (
            <li key={s.contractId} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={selected.has(s.contractId)}
                onChange={() => toggle(s.contractId)}
                aria-label={`Abbina ${s.contractClientName}`}
              />
              <span className="flex-1 text-primary">{s.contractClientName}</span>
              <ArrowRight size={14} strokeWidth={1.75} className="shrink-0 text-secondary" aria-hidden="true" />
              <span className="flex-1 text-secondary">{s.clientName}</span>
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
