import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { getFixedExpensesForYear } from '@/lib/db';
import ReportsYearSelect from '@/components/ReportsYearSelect';
import FixedExpenseAmountInput from '@/components/FixedExpenseAmountInput';
import FixedExpenseActiveToggle from '@/components/FixedExpenseActiveToggle';
import AddFixedExpenseCategoryModal from '@/components/AddFixedExpenseCategoryModal';
import DeleteFixedExpenseCategoryButton from '@/components/DeleteFixedExpenseCategoryButton';

export const metadata = { title: 'Spese Fisse' };

function formatEuro(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SearchParams = { year?: string };

export default async function SpeseFissePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'fixed_expenses', 'read')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const fiscalYear = params.year ? Number(params.year) : currentYear;

  const { rows, total } = await getFixedExpensesForYear(fiscalYear);

  const canCreate = hasPermission(role, 'fixed_expenses', 'create');
  const canDelete = canDeleteResource(role, '', '', 'fixed_expenses');
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Spese Fisse</h1>
        <div className="flex items-center gap-3">
          <ReportsYearSelect basePath="/dashboard/reports/spese-fisse" fiscalYear={fiscalYear} yearOptions={yearOptions} />
          {canCreate && <AddFixedExpenseCategoryModal />}
        </div>
      </div>

      <div className="overflow-x-auto p-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-border text-left text-secondary">
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Importo</th>
              <th className="px-3 py-2 font-medium">Stato</th>
              {canDelete && <th className="px-3 py-2 font-medium">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.categoryId} className="border-b border-grid-border/60 text-primary">
                <td className="px-3 py-2">{row.categoryLabel}</td>
                <td className="px-3 py-2 text-right">
                  <FixedExpenseAmountInput categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
                </td>
                <td className="px-3 py-2">
                  <FixedExpenseActiveToggle categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
                </td>
                {canDelete && (
                  <td className="px-3 py-2">
                    <DeleteFixedExpenseCategoryButton categoryId={row.categoryId} categoryLabel={row.categoryLabel} />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 4 : 3} className="px-3 py-8 text-center text-secondary">
                  Nessuna categoria di spesa fissa.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-grid-border font-semibold text-primary">
                <td className="px-3 py-3">Totale (voci incluse)</td>
                <td className="px-3 py-3 text-right">{formatEuro(total)}</td>
                <td colSpan={canDelete ? 2 : 1} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
