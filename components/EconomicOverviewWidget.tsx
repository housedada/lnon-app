import { Receipt, FileSignature, Clock } from 'lucide-react';
import type { JobsForecastResult, ContractsStats, HourlyContractsSummary } from '@/lib/db';
import CreditRiskSection from '@/components/CreditRiskSection';
import TopClientsSection from '@/components/TopClientsSection';
import ConversionFunnelSection from '@/components/ConversionFunnelSection';
import ProviderExpirationsSection from '@/components/ProviderExpirationsSection';
import type { Contract } from '@/lib/types';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Tile({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon?: typeof Receipt;
}) {
  return (
    <div className="border-b border-r border-grid-border px-5 py-3 last:border-r-0">
      <p className="detail-label flex items-center gap-1.5">
        {Icon && <Icon size={11} strokeWidth={1.75} className="shrink-0" style={{ color }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>
        {formatExact(value)}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-secondary">{sub}</p>}
    </div>
  );
}

// Stessi colori usati negli altri widget infografici dell'app, per coerenza:
// blu per i contratti web, ocra per il conteggio orario, verde per i ricavi
// generici, rosso per le uscite.
const FATTURATO_COLOR = '#2f9e6b';
const CONTRACTS_WEB_COLOR = '#0ea5e9';
const HOURLY_COLOR = '#b8860b';
// Dal più tenue (meno certo) al più marcato/brillante (Confermato).
const POTENZIALE_GRAYS = ['#9ca3af', '#6b7280', '#1f2937'];
const USCITE_COLOR = '#c94848';
const MARGINE_POSITIVE_COLOR = '#2f9e6b';
const MARGINE_NEGATIVE_COLOR = '#c94848';

/**
 * Prima bozza di quadro economico complessivo: mette insieme le fonti già
 * integrate nell'app (contratti web ricorrenti, conteggio orario, lavori
 * dell'anno selezionato, spese fisse dell'anno).
 *
 * "Entrate attuali" = solo il fatturato lavori dell'anno: contratti web e
 * conteggio orario generano Job/fatture a loro volta, quindi sono già
 * ricompresi in quel totale — le due tessere qui sotto sono un dettaglio
 * informativo (quanto viene da lì), NON un importo da sommare di nuovo,
 * altrimenti li conteggeremmo due volte.
 * "Potenziale" = lavori non ancora confermati/fatturati, upside dell'anno.
 * "Uscite" = spese fornitori + spese fisse + costo provider dei contratti.
 * Punto di partenza da rifinire insieme.
 */
export default function EconomicOverviewWidget({
  fiscalYear,
  contractsStats,
  hourlySummary,
  fixedExpensesTotal,
  jobsForecastTotals,
  creditRisk,
  topClients,
  funnel,
  providerExpirations,
}: {
  fiscalYear: number;
  contractsStats: ContractsStats;
  hourlySummary: HourlyContractsSummary;
  fixedExpensesTotal: number;
  jobsForecastTotals: JobsForecastResult['totals'];
  creditRisk: JobsForecastResult['creditRisk'];
  topClients: JobsForecastResult['topClients'];
  funnel: JobsForecastResult['funnel'];
  providerExpirations: Contract[];
}) {
  // Contratti Web e Conteggio Orario sono già ricompresi nel fatturato lavori
  // (generano a loro volta Job/fatture): non li sommiamo di nuovo qui sotto.
  const entrateAttuali = jobsForecastTotals.fatturato;
  const usciteTotali = jobsForecastTotals.speseFornitori + fixedExpensesTotal + contractsStats.providerCostTotal;
  const margine = entrateAttuali - usciteTotali;

  return (
    <div className="mx-6 mt-6 space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Entrate attuali {fiscalYear} — contratti web e conteggio orario sono dettaglio, già inclusi nel fatturato
        </p>
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-grid-border bg-card-bg sm:grid-cols-3">
          <Tile
            label={`Fatturato lavori ${fiscalYear}`}
            value={jobsForecastTotals.fatturato}
            sub={jobsForecastTotals.fatturatoNonRiscosso > 0 ? `Non riscosso: ${formatExact(jobsForecastTotals.fatturatoNonRiscosso)}` : undefined}
            color={FATTURATO_COLOR}
            icon={Receipt}
          />
          <Tile
            label="Contratti Web"
            value={contractsStats.generalTotal}
            sub={`${contractsStats.count} attivi · importo annuale`}
            color={CONTRACTS_WEB_COLOR}
            icon={FileSignature}
          />
          <Tile label="Conteggio Orario" value={hourlySummary.totalAmount} sub={`${hourlySummary.count} contratti`} color={HOURLY_COLOR} icon={Clock} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Potenziale {fiscalYear} — lavori non ancora fatturati (upside)
        </p>
        <div className="card-shadow grid grid-cols-3 overflow-hidden rounded-lg border border-grid-border bg-card-bg">
          <Tile label="Potenziale" value={jobsForecastTotals.potenziale} color={POTENZIALE_GRAYS[0]} />
          <Tile label="Preventivato" value={jobsForecastTotals.preventivato} color={POTENZIALE_GRAYS[1]} />
          <Tile label="Confermato" value={jobsForecastTotals.confermato} color={POTENZIALE_GRAYS[2]} />
        </div>
      </div>

      <CreditRiskSection fiscalYear={fiscalYear} creditRisk={creditRisk} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClientsSection topClients={topClients} />
        <ConversionFunnelSection funnel={funnel} />
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

      <ProviderExpirationsSection contracts={providerExpirations} />

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
