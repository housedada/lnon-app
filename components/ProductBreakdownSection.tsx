import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductBreakdownSection({
  fiscalYear,
  productBreakdown,
}: {
  fiscalYear: number;
  productBreakdown: JobsForecastResult['productBreakdown'];
}) {
  const total = productBreakdown.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">Fatturato per prodotto {fiscalYear}</p>
        {productBreakdown.length > 0 && <p className="text-[10px] font-medium text-secondary">Totale: {formatExact(total)}</p>}
      </div>
      {productBreakdown.length === 0 ? (
        <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
          <p className="py-2 text-xs text-secondary">Nessuna sottovoce sincronizzata da Fatture in Cloud.</p>
        </div>
      ) : (
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-grid-border bg-card-bg sm:grid-cols-4 lg:grid-cols-8">
          {productBreakdown.map((product) => (
            <div key={product.productId ?? 'non-categorizzato'} className="border-b border-r border-grid-border px-4 py-3 last:border-r-0">
              <p className="detail-label truncate">{product.productName}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{formatExact(product.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
