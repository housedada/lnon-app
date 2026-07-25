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

function StatTile({ label, value, exact, color }: { label: string; value: string; exact: string; color: string }) {
  return (
    <div className="border-b border-r border-sky-500/20 px-5 py-3 last:border-r-0">
      <p className="detail-label">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-secondary">{exact}</p>
    </div>
  );
}

const POTENZIALE_COLOR = '#8a8f98';
const PREVENTIVATO_COLOR = '#c9932f';
const CONFERMATO_COLOR = '#0ea5e9';
const FATTURATO_COLOR = '#2f9e6b';
const SPESE_COLOR = '#c94848';

export default function JobsForecastStatsWidget({ totals }: { totals: JobsForecastResult['totals'] }) {
  return (
    <div className="card-shadow mx-6 mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-sky-500/30 bg-sky-500/5 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Potenziale" value={formatCompact(totals.potenziale)} exact={formatExact(totals.potenziale)} color={POTENZIALE_COLOR} />
      <StatTile label="Preventivato" value={formatCompact(totals.preventivato)} exact={formatExact(totals.preventivato)} color={PREVENTIVATO_COLOR} />
      <StatTile label="Confermato" value={formatCompact(totals.confermato)} exact={formatExact(totals.confermato)} color={CONFERMATO_COLOR} />
      <StatTile label="Fatturato" value={formatCompact(totals.fatturato)} exact={formatExact(totals.fatturato)} color={FATTURATO_COLOR} />
      <StatTile label="Spese fornitori" value={formatCompact(totals.speseFornitori)} exact={formatExact(totals.speseFornitori)} color={SPESE_COLOR} />
    </div>
  );
}
