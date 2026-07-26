'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ProjectInvoice, ProjectInvoiceStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProjectInvoiceStatus, string> = {
  da_fatturare: 'Da fatturare',
  fatturata: 'Fatturata',
  annullata: 'Annullata',
  accorpata: 'Accorpata',
};

const STATUS_BADGE: Record<ProjectInvoiceStatus, string> = {
  da_fatturare: 'bg-amber-500/10 text-amber-700',
  fatturata: 'bg-green-600/10 text-green-700',
  annullata: 'bg-red-600/10 text-red-700',
  accorpata: 'bg-grid-header-bg text-secondary',
};

function formatAmount(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

/**
 * Anteprima rapida di una fattura in formato "documento" (invece della
 * griglia generica di DetailModal): intestazione, voci, totali con
 * l'importo finale in grande — stile minimale, non un vero facsimile.
 */
export default function InvoicePreviewModal({ invoice, showAmounts, onClose }: { invoice: ProjectInvoice; showAmounts: boolean; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel card-shadow w-full max-w-md rounded-xl border border-grid-border bg-card-bg p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="detail-label">Fattura</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold text-primary">{invoice.clientName}</h2>
            <p className="mt-0.5 truncate text-xs text-secondary">
              {invoice.projectTitle}
              {invoice.jobTitle ? ` · ${invoice.jobTitle}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button type="button" onClick={onClose} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
              <X size={18} strokeWidth={1.75} />
            </button>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[invoice.status]}`}>{STATUS_LABEL[invoice.status]}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-secondary">
          <span>N. {invoice.invoiceNumber ?? '—'}</span>
          <span>{formatDate(invoice.invoiceDate ?? invoice.createdAt)}</span>
        </div>

        {invoice.lineItems.length > 0 && (
          <div className="mt-6 divide-y divide-grid-border border-y border-grid-border">
            {invoice.lineItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate text-primary">{item.label}</span>
                <span className="shrink-0 text-secondary">{showAmounts ? formatAmount(item.netAmount) : '••••'}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-secondary">
            <span>Imponibile</span>
            <span>{showAmounts ? formatAmount(invoice.netAmount) : '••••'}</span>
          </div>
          <div className="flex items-center justify-between text-secondary">
            <span>IVA {invoice.vatRate}%</span>
            <span>{showAmounts ? formatAmount(invoice.vatAmount) : '••••'}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t-2 border-grid-border pt-4">
          <span className="text-sm font-medium text-primary">Totale</span>
          <span className="text-3xl font-bold text-primary">{showAmounts ? formatAmount(invoice.totalAmount) : '••••'}</span>
        </div>

        {invoice.paymentStatus && (
          <p className="mt-3 text-center text-[11px] text-secondary">Pagamento: {invoice.paymentStatus}</p>
        )}
      </div>
    </div>,
    document.body
  );
}
