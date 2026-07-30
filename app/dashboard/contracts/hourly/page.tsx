import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContracts, getAllClientNames, getUsers } from '@/lib/db';
import HourlyContractRow from '@/components/HourlyContractRow';
import NewHourlyContractButton from '@/components/NewHourlyContractButton';
import { listGridCappedClass } from '@/lib/listGridCols';

export const metadata = { title: 'Contratti' };

const GRID_TEMPLATE = 'repeat(6, minmax(max-content, 1fr)) max-content';
const GRID_CLASS = `grid w-full text-[12px] ${listGridCappedClass(GRID_TEMPLATE)}`;

export default async function HourlyContractsPage() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'hourly_billing', 'read')) {
    redirect('/dashboard');
  }

  const [contracts, clientOptions, users] = await Promise.all([getHourlyContracts(), getAllClientNames(), getUsers()]);
  const userOptions = users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const canCreate = hasPermission(role, 'hourly_billing', 'create');

  return (
    <div>
      <div className="flex items-center justify-end p-6 pb-0">
        {canCreate && <NewHourlyContractButton clientOptions={clientOptions} userOptions={userOptions} />}
      </div>

      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className={GRID_CLASS} style={{ gridTemplateColumns: GRID_TEMPLATE }}>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Tariffa</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Lavorazioni</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Ultima lavorazione</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {contracts.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun contratto a conteggio orario.
            </div>
          )}

          {contracts.map((c) => (
            <HourlyContractRow key={c.id} contract={c} canCreate={canCreate} />
          ))}
        </div>
      </div>
    </div>
  );
}
