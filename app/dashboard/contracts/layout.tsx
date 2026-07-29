import { auth } from '@/lib/auth';
import { getContractsStats, getHourlyContractsSummary } from '@/lib/db';
import { canViewAmounts } from '@/lib/permissions';
import SectionTabs from '@/components/SectionTabs';
import ContractsStatsWidget from '@/components/ContractsStatsWidget';

export default async function ContractsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const showAmounts = canViewAmounts(role);

  const [stats, hourlySummary] = await Promise.all([
    showAmounts ? getContractsStats() : Promise.resolve(null),
    showAmounts ? getHourlyContractsSummary() : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Contratti</h1>
      {stats && (
        <ContractsStatsWidget
          stats={stats}
          hourlyContractsCount={hourlySummary?.count}
          hourlyContractsTotal={hourlySummary?.totalAmount}
        />
      )}
      <SectionTabs
        storageKey="contracts-tab"
        tabs={[
          { key: 'manutenzioni', label: 'Web', href: '/dashboard/contracts' },
          { key: 'orario', label: 'Conteggio Orario', href: '/dashboard/contracts/hourly' },
        ]}
      />
      {children}
    </div>
  );
}
