'use client';

import { createPortal } from 'react-dom';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import type { SyncLineItemsResult } from '@/lib/actions/fic';

export default function SyncResultsModal({ results, onClose }: { results: SyncLineItemsResult[]; onClose: () => void }) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-grid-border bg-card-bg"
      >
        <div className="flex items-center justify-between border-b border-grid-border px-6 py-4">
          <h2 className="text-sm font-semibold text-primary">Sincronizzazione sottovoci FIC</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <p className="border-b border-grid-border px-6 py-3 text-xs text-secondary">
          {successCount} sincronizzat{successCount === 1 ? 'a' : 'e'}, {failCount} con errore.
        </p>
        <div className="flex-1 divide-y divide-grid-border overflow-y-auto">
          {results.map((r) => (
            <div key={r.id} className="flex items-start gap-2.5 px-6 py-3 text-sm">
              {r.success ? (
                <CheckCircle2 size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
              ) : (
                <XCircle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-primary">{r.clientName}</p>
                <p className="text-xs text-secondary">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
