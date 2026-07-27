import Link from 'next/link';
import { Clock, AlertTriangle, AlertOctagon } from 'lucide-react';
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

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#9ca3af',
  '30-60': '#c9932f',
  'oltre 60': '#c94848',
};

const BUCKET_ICONS: Record<string, typeof Clock> = {
  '0-30': Clock,
  '30-60': AlertTriangle,
  'oltre 60': AlertOctagon,
};

export default function CreditRiskSection({
  fiscalYear,
  creditRisk,
}: {
  fiscalYear: number;
  creditRisk: JobsForecastResult['creditRisk'];
}) {
  const hasUnpaid = creditRisk.topUnpaid.length > 0;

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Rischio credito {fiscalYear} — fatture emesse non ancora riscosse
      </p>
      <div className="card-shadow overflow-hidden rounded-lg border border-grid-border bg-card-bg">
        <div className="grid grid-cols-3">
          {creditRisk.buckets.map((bucket) => {
            const BucketIcon = BUCKET_ICONS[bucket.label];
            return (
            <div key={bucket.label} className="border-b border-r border-grid-border px-[15px] py-3 last:border-r-0 sm:px-5">
              <p className="detail-label flex items-center gap-1.5">
                {BucketIcon && <BucketIcon size={11} strokeWidth={1.75} className="shrink-0" style={{ color: BUCKET_COLORS[bucket.label] }} aria-hidden="true" />}
                {bucket.label} giorni
              </p>
              <p className="mt-1 text-xl font-semibold" style={{ color: BUCKET_COLORS[bucket.label] }}>
                {formatCompact(bucket.amount)}
              </p>
              <p className="mt-0.5 text-[10px] text-secondary">{formatExact(bucket.amount)}</p>
            </div>
            );
          })}
        </div>
        {hasUnpaid ? (
          <div className="space-y-1.5 border-t border-grid-border px-5 py-3">
            {creditRisk.topUnpaid.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-xs text-secondary">
                <span className="truncate">
                  {inv.clientName}
                  {inv.invoiceNumber ? ` · N. ${inv.invoiceNumber}` : ''}
                </span>
                <span className="shrink-0 pl-3">
                  {formatExact(inv.amount)} · {inv.days}gg
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-grid-border px-5 py-3 text-xs text-secondary">Nessuna fattura non riscossa.</p>
        )}
        <Link
          href={`/dashboard/invoices?unpaid=1&jobFiscalYear=${fiscalYear}`}
          className="block border-t border-grid-border px-5 py-2.5 text-xs font-medium text-secondary transition hover:text-primary"
        >
          Vai a tutte le fatture non riscosse →
        </Link>
      </div>
    </div>
  );
}
