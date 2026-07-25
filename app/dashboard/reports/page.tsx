import Link from 'next/link';
import { BarChart2, Wallet } from 'lucide-react';

export const metadata = { title: 'Report' };

export default function ReportsPage() {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Report</h1>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/reports/lavori"
          className="card-shadow flex items-center gap-3 rounded-xl border border-grid-border bg-card-bg p-5 transition hover:bg-row-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-grid-border text-secondary">
            <BarChart2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Overview Lavori</p>
            <p className="text-xs text-secondary">Potenziale, preventivato, confermato e fatturato per anno</p>
          </div>
        </Link>
        <Link
          href="/dashboard/reports/spese-fisse"
          className="card-shadow flex items-center gap-3 rounded-xl border border-grid-border bg-card-bg p-5 transition hover:bg-row-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-grid-border text-secondary">
            <Wallet size={18} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Spese Fisse</p>
            <p className="text-xs text-secondary">Costi fissi aziendali per anno (Commercialista, Attrezzatura, ecc.)</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
