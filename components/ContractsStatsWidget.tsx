'use client';

import { useContractsStatsStore } from '@/lib/store/contractsStatsStore';
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

function StatTile({ label, value, exact }: { label: string; value: string; exact?: string }) {
  return (
    <div className="px-5 py-1 first:pl-0 last:pr-0">
      <p className="detail-label">{label}</p>
      <p className="mt-1 text-xl font-semibold text-primary">{value}</p>
      {exact && <p className="mt-0.5 text-[10px] text-secondary">{exact}</p>}
    </div>
  );
}

export default function ContractsStatsWidget({ stats }: { stats: ContractsStats }) {
  const visible = useContractsStatsStore((s) => s.visible);

  if (!visible) return null;

  return (
    <div className="card-shadow mx-6 mt-6 flex flex-wrap items-center divide-x divide-sky-500/20 rounded-lg border border-sky-500/30 bg-sky-500/5 px-6 py-4">
      <StatTile label="Totale generale" value={formatCompact(stats.generalTotal)} exact={formatExact(stats.generalTotal)} />
      <StatTile label="Contratti totali" value={String(stats.count)} />
      <StatTile label="Manutenzione WP" value={formatCompact(stats.maintenanceTotal)} exact={formatExact(stats.maintenanceTotal)} />
      <StatTile label="Hosting" value={formatCompact(stats.hostingTotal)} exact={formatExact(stats.hostingTotal)} />
      <StatTile label="Analytics e GDPR" value={formatCompact(stats.analyticsTotal)} exact={formatExact(stats.analyticsTotal)} />
      <StatTile label="Cookie (Complianz)" value={formatCompact(stats.cookieTotal)} exact={formatExact(stats.cookieTotal)} />

      <div className="ml-auto">
        <StatTile label="Costi fornitori totali" value={formatCompact(stats.providerCostTotal)} exact={formatExact(stats.providerCostTotal)} />
      </div>
    </div>
  );
}
