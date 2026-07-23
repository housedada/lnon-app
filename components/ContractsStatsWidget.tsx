'use client';

import { useContractsStatsStore } from '@/lib/store/contractsStatsStore';
import AnimatedVisibility from '@/components/AnimatedVisibility';
import type { ContractsStats } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `€ ${(value / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}K`;
  }
  return `€ ${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
}

function StatTile({
  label,
  value,
  exact,
  color,
  emphasize,
}: {
  label: string;
  value: string;
  exact?: string;
  color?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="border-b border-r border-sky-500/20 px-5 py-3 last:border-r-0">
      <p className="detail-label">{label}</p>
      <p
        className={`mt-1 font-bold ${emphasize ? 'text-3xl' : 'text-xl font-semibold'}`}
        style={{ color: color ?? 'var(--color-primary)' }}
      >
        {value}
      </p>
      {exact && <p className="mt-0.5 text-[10px] text-secondary">{exact}</p>}
    </div>
  );
}

const ICON_COLOR = '#0ea5e9';
const TOTAL_COLOR = '#2f9e6b';
const EXPENSE_COLOR = '#c94848';

export default function ContractsStatsWidget({ stats }: { stats: ContractsStats }) {
  const visible = useContractsStatsStore((s) => s.visible);

  return (
    <AnimatedVisibility visible={visible}>
      <div className="card-shadow mx-6 mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-sky-500/30 bg-sky-500/5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatTile label="Totale generale" value={formatCompact(stats.generalTotal)} exact={formatExact(stats.generalTotal)} color={TOTAL_COLOR} emphasize />
        <StatTile label="Contratti totali" value={String(stats.count)} />
        <StatTile label="Manutenzione WP" value={formatCompact(stats.maintenanceTotal)} exact={formatExact(stats.maintenanceTotal)} color={ICON_COLOR} />
        <StatTile label="Hosting" value={formatCompact(stats.hostingTotal)} exact={formatExact(stats.hostingTotal)} color={ICON_COLOR} />
        <StatTile label="Analytics e GDPR" value={formatCompact(stats.analyticsTotal)} exact={formatExact(stats.analyticsTotal)} color={ICON_COLOR} />
        <StatTile label="Cookie (Complianz)" value={formatCompact(stats.cookieTotal)} exact={formatExact(stats.cookieTotal)} color={ICON_COLOR} />
        <StatTile label="Costi fornitori totali" value={formatCompact(stats.providerCostTotal)} exact={formatExact(stats.providerCostTotal)} color={EXPENSE_COLOR} emphasize />
      </div>
    </AnimatedVisibility>
  );
}
