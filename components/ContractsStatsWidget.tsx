'use client';

import { useContractsStatsStore } from '@/lib/store/contractsStatsStore';
import type { ContractsStats } from '@/lib/db';

function formatAmount(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="detail-label">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

export default function ContractsStatsWidget({ stats }: { stats: ContractsStats }) {
  const visible = useContractsStatsStore((s) => s.visible);

  if (!visible) return null;

  return (
    <div className="card-shadow mx-6 mt-6 flex flex-wrap items-center justify-between gap-6 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
      <StatTile label="Contratti totali" value={String(stats.count)} />

      <div className="flex flex-wrap items-center gap-6">
        <StatTile label="Manutenzione WP" value={formatAmount(stats.maintenanceTotal)} />
        <StatTile label="Hosting" value={formatAmount(stats.hostingTotal)} />
        <StatTile label="Analytics e GDPR" value={formatAmount(stats.analyticsTotal)} />
        <StatTile label="Cookie (Complianz)" value={formatAmount(stats.cookieTotal)} />
      </div>

      <div className="ml-auto">
        <StatTile label="Costi fornitori totali" value={formatAmount(stats.providerCostTotal)} />
      </div>
    </div>
  );
}
