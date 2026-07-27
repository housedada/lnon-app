import Link from 'next/link';
import { Package, AlertCircle } from 'lucide-react';
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `€ ${(value / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}K`;
  }
  return `€ ${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
}

export default function ProductBreakdownSection({
  fiscalYear,
  productBreakdown,
  uncategorizedInvoices,
}: {
  fiscalYear: number;
  productBreakdown: JobsForecastResult['productBreakdown'];
  uncategorizedInvoices: JobsForecastResult['uncategorizedInvoices'];
}) {
  const total = productBreakdown.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
          <Package size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          Fatturato per prodotto {fiscalYear}
        </p>
        {productBreakdown.length > 0 && <p className="text-[10px] font-medium text-secondary">Totale: {formatExact(total)}</p>}
      </div>
      {productBreakdown.length === 0 ? (
        <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
          <p className="py-2 text-xs text-secondary">Nessuna sottovoce sincronizzata da Fatture in Cloud.</p>
        </div>
      ) : (
        <div className="card-shadow overflow-hidden rounded-lg border border-grid-border bg-card-bg">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {productBreakdown.map((product) => (
              <div key={product.productId ?? 'non-categorizzato'} className="border-b border-r border-grid-border px-4 py-3 last:border-r-0">
                <p className="detail-label truncate">{product.productName}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{formatCompact(product.amount)}</p>
                <p className="mt-0.5 truncate text-[9px] text-secondary">{formatExact(product.amount)}</p>
              </div>
            ))}
          </div>
          {uncategorizedInvoices.length > 0 && (
            <div className="border-t border-grid-border px-4 py-3">
              <p className="detail-label mb-1.5 flex items-center gap-1.5">
                <AlertCircle size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                Fatture con sottovoci non categorizzate ({uncategorizedInvoices.length})
              </p>
              <ul className="space-y-1">
                {uncategorizedInvoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between text-xs text-secondary">
                    <span className="truncate">{inv.clientName}</span>
                    <span className="shrink-0 pl-3">{formatExact(inv.amount)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/dashboard/invoices?syncState=not_synced`}
                className="mt-2 inline-block text-[11px] font-medium text-secondary underline transition hover:text-primary"
              >
                Vai alle fatture non sincronizzate →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
