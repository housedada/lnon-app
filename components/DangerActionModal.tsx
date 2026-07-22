'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';

interface DangerActionModalProps {
  action: (formData: FormData) => void | Promise<void>;
  resourceLabel: string;
  triggerLabel?: string;
  confirmWord?: string;
  successMessage?: string;
}

export default function DangerActionModal({
  action,
  resourceLabel,
  triggerLabel = 'Elimina',
  confirmWord = 'ELIMINA',
  successMessage,
}: DangerActionModalProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const matches = input.trim() === confirmWord;

  function close() {
    if (isPending) return;
    setOpen(false);
    setInput('');
  }

  function handleConfirm() {
    if (!matches) return;
    startTransition(async () => {
      if (successMessage) notify(successMessage);
      await action(new FormData());
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-600/30 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-600/5"
      >
        <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
        {triggerLabel}
      </button>

      {open &&
        createPortal(
          <div
            className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={close}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="danger-modal-title"
              className="modal-panel card-shadow w-full max-w-sm rounded-xl border border-grid-border bg-card-bg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600/10 text-red-600">
                    <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h2 id="danger-modal-title" className="text-sm font-semibold text-primary">
                    Conferma eliminazione
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Chiudi"
                  className="text-secondary transition hover:text-primary"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              <p className="mt-4 text-sm text-secondary">
                Stai per eliminare {resourceLabel}. Questa azione non può essere annullata. Per confermare, scrivi{' '}
                <strong className="text-primary">{confirmWord}</strong> qui sotto.
              </p>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={confirmWord}
                autoFocus
                className="field-input mt-4 w-full border border-grid-border bg-transparent px-3 py-2 text-sm text-primary"
              />

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
                  disabled={!matches || isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
                  {isPending ? 'Eliminazione...' : 'Elimina definitivamente'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
