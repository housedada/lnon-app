import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContractById, getHourlyWorkEntries } from '@/lib/db';
import HourlyWorkEntryRow from '@/components/HourlyWorkEntryRow';
import NewHourlyWorkEntryButton from '@/components/NewHourlyWorkEntryButton';

export const metadata = { title: 'Contratto a conteggio orario' };

export default async function HourlyContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'hourly_billing', 'read')) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const contract = await getHourlyContractById(id);
  if (!contract) notFound();

  const entries = await getHourlyWorkEntries(id);
  const canCreate = hasPermission(role, 'hourly_billing', 'create');

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {contract.clientName}
            {contract.referenceName && <span className="text-secondary"> ({contract.referenceName})</span>}
          </h1>
          <p className="text-sm text-secondary">
            {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
          </p>
        </div>
        {canCreate && <NewHourlyWorkEntryButton hourlyContractId={contract.id} />}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-3 border-b border-grid-border px-4 py-2 text-xs font-medium text-secondary">
          <span>Riferimento</span>
          <span>Descrizione</span>
          <span>Aperta</span>
          <span>Completata</span>
          <span>Ore</span>
          <span>Importo</span>
          <span>Stato</span>
        </div>
        {entries.map((e) => (
          <HourlyWorkEntryRow key={e.id} entry={e} />
        ))}
        {entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-secondary">Nessuna lavorazione registrata.</p>
        )}
      </div>
    </div>
  );
}
