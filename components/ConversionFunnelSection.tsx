import type { JobsForecastResult } from '@/lib/db';

const STAGES: { key: keyof JobsForecastResult['funnel']; label: string; color: string }[] = [
  { key: 'potenziale', label: 'Potenziale', color: '#9ca3af' },
  { key: 'preventivato', label: 'Preventivato', color: '#6b7280' },
  { key: 'confermato', label: 'Confermato', color: '#1f2937' },
  { key: 'fatturato', label: 'Fatturato', color: '#2f9e6b' },
];

export default function ConversionFunnelSection({ funnel }: { funnel: JobsForecastResult['funnel'] }) {
  const conversionRate = funnel.total > 0 ? Math.round((funnel.fatturato / funnel.total) * 100) : 0;

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Funnel di conversione — {funnel.total} lavori nell&apos;anno
      </p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const count = funnel[stage.key] as number;
            const pct = funnel.total > 0 ? Math.round((count / funnel.total) * 100) : 0;
            return (
              <div key={stage.key} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-secondary">{stage.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-grid-header-bg">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: stage.color }} />
                </div>
                <span className="w-10 shrink-0 text-right font-medium text-primary">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-secondary">
          <span className="font-semibold text-primary">{conversionRate}%</span> dei lavori dell&apos;anno è già fatturato
        </p>
      </div>
    </div>
  );
}
