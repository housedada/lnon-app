import type { JobsForecastResult, ContractsStats, HourlyContractsSummary } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Tile({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="border-b border-r border-grid-border px-5 py-3 last:border-r-0">
      <p className="detail-label">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>
        {formatExact(value)}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-secondary">{sub}</p>}
    </div>
  );
}

const ENTRATE_COLOR = '#2f9e6b';
const POTENZIALE_COLOR = '#c9932f';
const USCITE_COLOR = '#c94848';
const MARGINE_POSITIVE_COLOR = '#2f9e6b';
const MARGINE_NEGATIVE_COLOR = '#c94848';

/**
 * Prima bozza di quadro economico complessivo: mette insieme le fonti già
 * integrate nell'app (contratti web ricorrenti, conteggio orario, lavori
 * dell'anno selezionato, spese fisse dell'anno). "Entrate attuali" = ricavi
 * già certi (contratti attivi annualizzati + conteggio orario + lavori già
 * fatturati); "Potenziale" = lavori non ancora confermati/fatturati, upside
 * dell'anno; "Uscite" = spese fornitori + spese fisse + costo provider dei
 * contratti. Punto di partenza da rifinire insieme.
 */
export default function EconomicOverviewWidget({
  fiscalYear,
  contractsStats,
  hourlySummary,
  fixedExpensesTotal,
  jobsForecastTotals,
}: {
  fiscalYear: number;
  contractsStats: ContractsStats;
  hourlySummary: HourlyContractsSummary;
  fixedExpensesTotal: number;
  jobsForecastTotals: JobsForecastResult['totals'];
}) {
  const contractsAnnualized = contractsStats.generalTotal * 12;
  const entrateAttuali = contractsAnnualized + hourlySummary.totalAmount + jobsForecastTotals.fatturato;
  const potenzialeUpside = jobsForecastTotals.potenziale + jobsForecastTotals.preventivato + jobsForecastTotals.confermato;
  const usciteTotali = jobsForecastTotals.speseFornitori + fixedExpensesTotal + contractsStats.providerCostTotal;
  const margine = entrateAttuali - usciteTotali;

  return (
    <div className="mx-6 mt-6 space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Entrate attuali — contratti ricorrenti, conteggio orario, lavori {fiscalYear} già fatturati
        </p>
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-green-600/30 bg-green-600/5 sm:grid-cols-3">
          <Tile label="Contratti Web (annualizzato)" value={contractsAnnualized} sub={`${contractsStats.count} attivi · € ${contractsStats.generalTotal.toFixed(2)}/mese`} color={ENTRATE_COLOR} />
          <Tile label="Conteggio Orario" value={hourlySummary.totalAmount} sub={`${hourlySummary.count} contratti`} color={ENTRATE_COLOR} />
          <Tile label={`Lavori fatturato ${fiscalYear}`} value={jobsForecastTotals.fatturato} color={ENTRATE_COLOR} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Potenziale {fiscalYear} — lavori non ancora fatturati (upside)
        </p>
        <div className="card-shadow grid grid-cols-3 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
          <Tile label="Potenziale" value={jobsForecastTotals.potenziale} color={POTENZIALE_COLOR} />
          <Tile label="Preventivato" value={jobsForecastTotals.preventivato} color={POTENZIALE_COLOR} />
          <Tile label="Confermato" value={jobsForecastTotals.confermato} color={POTENZIALE_COLOR} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Uscite — spese fornitori lavori {fiscalYear}, spese fisse {fiscalYear}, costo provider contratti
        </p>
        <div className="card-shadow grid grid-cols-3 overflow-hidden rounded-lg border border-red-600/30 bg-red-600/5">
          <Tile label={`Spese fornitori ${fiscalYear}`} value={jobsForecastTotals.speseFornitori} color={USCITE_COLOR} />
          <Tile label={`Spese fisse ${fiscalYear}`} value={fixedExpensesTotal} color={USCITE_COLOR} />
          <Tile label="Costo provider contratti" value={contractsStats.providerCostTotal} color={USCITE_COLOR} />
        </div>
      </div>

      <div className="card-shadow flex items-center justify-between rounded-lg border border-grid-border bg-card-bg px-5 py-4">
        <div>
          <p className="detail-label">Margine stimato (entrate attuali − uscite)</p>
          <p className="mt-0.5 text-[10px] text-secondary">Non include il potenziale non ancora confermato</p>
        </div>
        <p className="text-2xl font-bold" style={{ color: margine >= 0 ? MARGINE_POSITIVE_COLOR : MARGINE_NEGATIVE_COLOR }}>
          {formatExact(margine)}
        </p>
      </div>
    </div>
  );
}
