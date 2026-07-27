import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  getJobsForecast,
  getContractsStats,
  getHourlyContractsSummary,
  getFixedExpensesForYear,
  getUpcomingProviderExpirations,
  type JobForecastCategory,
} from '@/lib/db';
import EconomicOverviewWidget from '@/components/EconomicOverviewWidget';
import ReportsYearSelect from '@/components/ReportsYearSelect';

export const metadata = { title: 'Report' };

const CATEGORY_LABEL: Record<JobForecastCategory, string> = {
  potenziale: 'Potenziale',
  preventivato: 'Preventivato',
  confermato: 'Confermato',
};

function formatEuro(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  const [{ rows, totals, creditRisk, topClients, funnel, productBreakdown, uncategorizedInvoices }, contractsStats, hourlySummary, fixedExpenses, providerExpirations] = await Promise.all([
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
        creditRisk={creditRisk}
        topClients={topClients}
        funnel={funnel}
        productBreakdown={productBreakdown}
        uncategorizedInvoices={uncategorizedInvoices}
        providerExpirations={providerExpirations}
      />

      <h2 className="mx-6 mt-8 text-sm font-semibold text-primary">Lavori {fiscalYear}</h2>

      <div className="overflow-x-auto p-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-border text-left text-secondary">
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Lavoro</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Budget stimato</th>
              <th className="px-3 py-2 text-right font-medium">Spese fornitori</th>
              <th className="px-3 py-2 text-right font-medium">Fatturato</th>
              <th className="px-3 py-2 text-right font-medium">Margine</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.jobId} className="border-b border-grid-border/60 text-primary">
                <td className="px-3 py-2">{row.clientName}</td>
                <td className="px-3 py-2">{row.title}</td>
                <td className="px-3 py-2">{CATEGORY_LABEL[row.category]}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.estimatedBudget)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.supplierCost)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.invoicedAmount)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.margin)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-secondary">
                  Nessun lavoro con anno di competenza {fiscalYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
