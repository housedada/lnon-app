import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContracts, getAllClientNames, getUsers } from '@/lib/db';
import SectionTabs from '@/components/SectionTabs';
import HourlyContractRow from '@/components/HourlyContractRow';
import NewHourlyContractButton from '@/components/NewHourlyContractButton';

export const metadata = { title: 'Conteggio Orario Web' };

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
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Contratti</h1>
        {canCreate && <NewHourlyContractButton clientOptions={clientOptions} userOptions={userOptions} />}
      </div>

      <SectionTabs
        tabs={[
          { key: 'manutenzioni', label: 'Manutenzioni', href: '/dashboard/contracts' },
          { key: 'orario', label: 'Conteggio Orario Web', href: '/dashboard/contracts/hourly' },
        ]}
        activeKey="orario"
      />

      <div className="p-6">
        <div className="grid grid-cols-6 gap-3 border-b border-grid-border px-4 py-2 text-xs font-medium text-secondary">
          <span>Cliente</span>
          <span>Tariffa</span>
          <span>Stato</span>
          <span>Lavorazioni</span>
          <span>Ultima lavorazione</span>
          <span className="text-right">Totale</span>
        </div>
        {contracts.map((c) => (
          <HourlyContractRow key={c.id} contract={c} />
        ))}
        {contracts.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-secondary">Nessun contratto a conteggio orario.</p>
        )}
      </div>
    </div>
  );
}
