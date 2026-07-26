'use client';

import { createPortal } from 'react-dom';
import { X, FileOutput } from 'lucide-react';
import { USER_TAG_COLORS } from '@/lib/types';
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

// Colore stabile per riga (nessun productId reale in ProjectInvoiceLineItem
// oggi): un hash del testo pesca dalla stessa palette pastello usata per i
// colori prodotto altrove nell'app, così è coerente pur senza un vero legame.
function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return USER_TAG_COLORS[hash % USER_TAG_COLORS.length];
}

const RING_HOLES = 6;

/**
 * Anteprima fattura in forma di foglio: proporzioni A4 su desktop,
 * intestazione in alto, voci con pallino colorato subito sotto, totali
 * ancorati in fondo. Bordi minimal-outline, fori a sinistra come un foglio
 * di quaderno ad anelli, e un angolo ripiegato verso l'interno in alto a
 * destra come se si fosse piegato per sbaglio.
 */
export default function InvoicePreviewModal({
  invoice,
  showAmounts,
  onClose,
  onGenerateFic,
}: {
  invoice: ProjectInvoice;
  showAmounts: boolean;
  onClose: () => void;
  onGenerateFic?: () => void;
}) {
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel card-shadow relative flex w-full max-w-md flex-col overflow-hidden rounded-md border border-grid-border bg-card-bg sm:aspect-[210/297] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Angolo ripiegato verso l'interno, come piegato per sbaglio */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-7 w-7 border-b border-l border-grid-border"
          style={{
            background: `linear-gradient(135deg, transparent 50%, var(--color-content-bg) 50%)`,
            clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
          }}
        />

        {/* Fori a sinistra, come un foglio di quaderno ad anelli */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex w-8 flex-col items-center justify-evenly py-8">
          {Array.from({ length: RING_HOLES }).map((_, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full border border-grid-border" />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-9 z-10 text-secondary transition hover:text-primary"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-8 pl-12 pr-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="detail-label">Fattura</p>
              <h2 className="mt-0.5 truncate text-xl font-semibold text-primary">{invoice.clientName}</h2>
              <p className="mt-0.5 truncate text-xs text-secondary">
                {invoice.projectTitle}
                {invoice.jobTitle ? ` · ${invoice.jobTitle}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[invoice.status]}`}>{STATUS_LABEL[invoice.status]}</span>
              {onGenerateFic && invoice.status === 'da_fatturare' && (
                <button
                  type="button"
                  onClick={onGenerateFic}
                  title="Genera su Fatture in Cloud"
                  className="flex items-center gap-1 text-[10px] font-medium text-secondary transition hover:text-primary"
                >
                  <FileOutput size={12} strokeWidth={1.75} aria-hidden="true" />
                  Genera su FIC
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-secondary">
            <span>N. {invoice.invoiceNumber ?? '—'}</span>
            <span>{formatDate(invoice.invoiceDate ?? invoice.createdAt)}</span>
          </div>

          {invoice.lineItems.length > 0 && (
            <div className="mt-6 divide-y divide-grid-border border-y border-grid-border">
              {invoice.lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorForLabel(item.label) }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-primary">{item.label}</span>
                  <span className="shrink-0 text-secondary">{showAmounts ? formatAmount(item.netAmount) : '••••'}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-6">
            <div className="space-y-1.5 text-sm">
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
        </div>
      </div>
    </div>,
    document.body
  );
}
