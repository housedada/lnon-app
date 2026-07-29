import { Receipt, FileSignature, Clock, TrendingUp, FileClock, ListChecks, CheckCircle2, Truck, Wallet, Server, Scale } from 'lucide-react';
import type { JobsForecastResult, ContractsStats, HourlyContractsSummary } from '@/lib/db';
import ConversionFunnelSection from '@/components/ConversionFunnelSection';
import ProviderExpirationsSection from '@/components/ProviderExpirationsSection';
import type { Contract } from '@/lib/types';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Stessa logica "cifra compatta grande + cifra estesa piccola sotto" già
// usata negli altri widget infografici (es. JobsForecastStatsWidget).
function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `€ ${(value / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}K`;
  }
  return `€ ${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
}

function Tile({
  label,
  value,
  sub,
  color,
  icon: Icon,
  valueAlign = 'left',
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon?: typeof Receipt;
  valueAlign?: 'left' | 'right';
}) {
  if (valueAlign === 'right') {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-r border-grid-border px-[15px] py-3 last:border-r-0 sm:px-5">
        <p className="detail-label flex min-w-0 items-center gap-1.5">
          {Icon && <Icon size={11} strokeWidth={1.75} className="shrink-0" style={{ color }} aria-hidden="true" />}
          <span className="truncate">{label}</span>
        </p>
        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold" style={{ color }}>
            {formatCompact(value)}
          </p>
          <p className="mt-0.5 text-[10px] text-secondary">{formatExact(value)}</p>
          {sub && <p className="mt-0.5 text-[10px] text-secondary">{sub}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-r border-grid-border px-[15px] py-3 last:border-r-0 sm:px-5">
      <p className="detail-label flex items-center gap-1.5">
        {Icon && <Icon size={11} strokeWidth={1.75} className="shrink-0" style={{ color }} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>
        {formatCompact(value)}
      </p>
      <p className="mt-0.5 text-[10px] text-secondary">{formatExact(value)}</p>
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
const POTENZIALE_GRAYS = ['#9ca3af', '#78716c', '#525252', '#1f2937'];
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
  funnel,
  providerExpirations,
}: {
  fiscalYear: number;
  contractsStats: ContractsStats;
  hourlySummary: HourlyContractsSummary;
  fixedExpensesTotal: number;
  jobsForecastTotals: JobsForecastResult['totals'];
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
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
          <Receipt size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          Flusso in Entrata
        </p>
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-grid-border bg-card-bg sm:grid-cols-3">
          <Tile
            label={`Fatturato lavori ${fiscalYear}`}
            value={jobsForecastTotals.fatturato}
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
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
          <TrendingUp size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          Potenziale {fiscalYear} — lavori non ancora fatturati (upside)
        </p>
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-grid-border bg-card-bg sm:grid-cols-4">
          <Tile label="Potenziale" value={jobsForecastTotals.potenziale} color={POTENZIALE_GRAYS[0]} icon={TrendingUp} />
          <Tile label="Pre-approvato" value={jobsForecastTotals.preApprovato} color={POTENZIALE_GRAYS[1]} icon={FileClock} />
          <Tile label="In corso" value={jobsForecastTotals.inCorso} color={POTENZIALE_GRAYS[2]} icon={ListChecks} />
          <Tile label="Confermato" value={jobsForecastTotals.confermato} color={POTENZIALE_GRAYS[3]} icon={CheckCircle2} />
        </div>
      </div>

      <ConversionFunnelSection funnel={funnel} />

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
          <Truck size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          Flusso in Uscita
        </p>
        <div className="card-shadow grid grid-cols-1 overflow-hidden rounded-lg border border-red-600/30 bg-red-600/5 sm:grid-cols-3">
          <Tile label={`Spese fornitori ${fiscalYear}`} value={jobsForecastTotals.speseFornitori} color={USCITE_COLOR} icon={Truck} valueAlign="right" />
          <Tile label={`Spese fisse ${fiscalYear}`} value={fixedExpensesTotal} color={USCITE_COLOR} icon={Wallet} valueAlign="right" />
          <Tile label="Costo provider contratti" value={contractsStats.providerCostTotal} color={USCITE_COLOR} icon={Server} valueAlign="right" />
        </div>
      </div>

      <ProviderExpirationsSection contracts={providerExpirations} />

      <div className="card-shadow flex items-center justify-between rounded-lg border border-grid-border bg-card-bg px-5 py-4">
        <div>
          <p className="detail-label flex items-center gap-1.5">
            <Scale size={11} strokeWidth={1.75} className="shrink-0 text-secondary" aria-hidden="true" />
            Margine stimato (entrate attuali − uscite)
          </p>
          <p className="mt-0.5 text-[10px] text-secondary">Non include il potenziale non ancora confermato</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: margine >= 0 ? MARGINE_POSITIVE_COLOR : MARGINE_NEGATIVE_COLOR }}>
            {formatCompact(margine)}
          </p>
          <p className="mt-0.5 text-[10px] text-secondary">{formatExact(margine)}</p>
        </div>
      </div>
    </div>
  );
}
