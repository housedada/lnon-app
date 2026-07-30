import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { getFixedExpensesForYear } from '@/lib/db';
import ReportsYearSelect from '@/components/ReportsYearSelect';
import FixedExpenseAmountInput from '@/components/FixedExpenseAmountInput';
import FixedExpenseActiveToggle from '@/components/FixedExpenseActiveToggle';
import AddFixedExpenseCategoryModal from '@/components/AddFixedExpenseCategoryModal';
import DeleteFixedExpenseCategoryButton from '@/components/DeleteFixedExpenseCategoryButton';
import RowActionsCell from '@/components/RowActionsCell';
import { listGridCappedClass } from '@/lib/listGridCols';

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
  const gridTemplate = 'repeat(3, minmax(max-content, 1fr)) max-content';

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Spese Fisse</h1>
        <div className="flex items-center gap-3">
          <ReportsYearSelect basePath="/dashboard/spese-fisse" fiscalYear={fiscalYear} yearOptions={yearOptions} />
          {canCreate && <AddFixedExpenseCategoryModal />}
        </div>
      </div>

      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className={`grid w-full text-[12px] ${listGridCappedClass(gridTemplate)}`} style={{ gridTemplateColumns: gridTemplate }}>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Categoria</div>
          <div className="list-header-cell flex items-center justify-end whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Importo</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {rows.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessuna categoria di spesa fissa.
            </div>
          )}

          {rows.map((row) => (
            <div key={row.categoryId} className="group contents">
              <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">
                {row.categoryLabel}
              </div>
              <div className="list-row-cell flex items-center justify-end whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                <FixedExpenseAmountInput categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
              </div>
              <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                <FixedExpenseActiveToggle categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
              </div>
              <RowActionsCell>
                {canDelete && <DeleteFixedExpenseCategoryButton categoryId={row.categoryId} categoryLabel={row.categoryLabel} />}
              </RowActionsCell>
            </div>
          ))}

          {rows.length > 0 && (
            <div className="contents">
              <div className="flex items-center whitespace-nowrap border-t-2 border-grid-border px-3 py-3 font-semibold text-primary">Totale (voci incluse)</div>
              <div className="flex items-center justify-end whitespace-nowrap border-t-2 border-grid-border px-3 py-3 font-semibold text-primary">{formatEuro(total)}</div>
              <div className="border-t-2 border-grid-border" />
              <div className="sticky right-0 z-[6] border-t-2 border-l border-grid-border bg-card-bg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
