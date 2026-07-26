'use client';

import { useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, Loader2 } from 'lucide-react';

export default function SimpleConfirmModal({
  title = 'Conferma',
  message,
  confirmLabel = 'Conferma',
  onConfirm,
  onClose,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function close() {
    if (isPending) return;
    onClose();
  }

  function handleConfirm() {
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Info size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h2 className="text-sm font-semibold text-primary">{title}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <p className="mt-4 text-sm text-secondary">{message}</p>

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
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
