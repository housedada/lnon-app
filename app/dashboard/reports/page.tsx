import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  getJobsForecast,
  getContractsStats,
  getHourlyContractsSummary,
  getFixedExpensesForYear,
  getUpcomingProviderExpirations,
} from '@/lib/db';
import EconomicOverviewWidget from '@/components/EconomicOverviewWidget';
import ReportsYearSelect from '@/components/ReportsYearSelect';
import ReportJobRow from '@/components/ReportJobRow';
import { listGridCappedClass } from '@/lib/listGridCols';

export const metadata = { title: 'Report' };

const GRID_TEMPLATE = 'repeat(6, minmax(max-content, 1fr)) max-content';
const GRID_CLASS = `grid w-full text-[12px] ${listGridCappedClass(GRID_TEMPLATE)}`;

type SearchParams = { year?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'reports', 'read')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const fiscalYear = params.year ? Number(params.year) : currentYear;

  const [{ rows, totals, funnel }, contractsStats, hourlySummary, fixedExpenses, providerExpirations] = await Promise.all([
    getJobsForecast(fiscalYear),
    getContractsStats(),
    getHourlyContractsSummary(),
    getFixedExpensesForYear(fiscalYear),
    getUpcomingProviderExpirations(30),
  ]);

  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Report</h1>
        <ReportsYearSelect basePath="/dashboard/reports" fiscalYear={fiscalYear} yearOptions={yearOptions} />
      </div>

      <EconomicOverviewWidget
        fiscalYear={fiscalYear}
        contractsStats={contractsStats}
        hourlySummary={hourlySummary}
        fixedExpensesTotal={fixedExpenses.total}
        jobsForecastTotals={totals}
        funnel={funnel}
        providerExpirations={providerExpirations}
      />

      <h2 className="mx-6 mt-8 text-sm font-semibold text-primary">Lavori {fiscalYear}</h2>

      <div className="mx-6 mt-3 mb-6 overflow-x-auto border-t border-grid-border">
        <div className={GRID_CLASS} style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Lavoro</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Categoria</div>
          <div className="list-header-cell flex items-center justify-end whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
          <div className="list-header-cell flex items-center justify-end whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Spese fornitori</div>
          <div className="list-header-cell flex items-center justify-end whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget reale</div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {rows.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro con anno di competenza {fiscalYear}.
            </div>
          )}

          {rows.map((row) => (
            <ReportJobRow key={row.jobId} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
