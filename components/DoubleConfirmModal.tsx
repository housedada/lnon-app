'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function DoubleConfirmModal({
  title = 'Conferma eliminazione',
  firstMessage,
  secondMessage,
  confirmLabel = 'Elimina definitivamente',
  onConfirm,
  onClose,
}: {
  title?: string;
  firstMessage: string;
  secondMessage: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();

  function close() {
    if (isPending) return;
    onClose();
  }

  function handleConfirm() {
    if (step === 1) {
      setStep(2);
      return;
    }
    startTransition(async () => {
      await onConfirm();
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel card-shadow w-full max-w-sm rounded-xl border border-grid-border bg-card-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600/10 text-red-600">
              <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-primary">{step === 1 ? title : 'Ultima conferma'}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <p className="mt-4 text-sm text-secondary">{step === 1 ? firstMessage : secondMessage}</p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
            {step === 1 ? 'Continua' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
