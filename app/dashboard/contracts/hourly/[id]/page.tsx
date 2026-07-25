import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContractById, getHourlyWorkEntries } from '@/lib/db';
import { HOURLY_ENTRY_GRID_TEMPLATE } from '@/lib/hourlyBilling';
import HourlyWorkEntryRow from '@/components/HourlyWorkEntryRow';
import NewHourlyWorkEntryButton from '@/components/NewHourlyWorkEntryButton';
import RestHourlyContractButton from '@/components/RestHourlyContractButton';
import type { HourlyContractStatus } from '@/lib/types';

export const metadata = { title: 'Contratto a conteggio orario' };

const STATUS_LABEL: Record<HourlyContractStatus, string> = {
  in_corso: 'In corso',
  riposo: 'Riposo',
};

const STATUS_BADGE: Record<HourlyContractStatus, string> = {
  in_corso: 'bg-green-600/10 text-green-700',
  riposo: 'bg-sky-500/10 text-sky-700',
};

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
  const canUpdate = hasPermission(role, 'hourly_billing', 'update');

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {contract.referenceName || contract.clientName}
            {contract.referenceName && <span className="ml-2 text-sm font-normal text-secondary">- {contract.clientName}</span>}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-secondary">
            <span>
              {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>
              {STATUS_LABEL[contract.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && contract.status === 'in_corso' && <RestHourlyContractButton hourlyContractId={contract.id} />}
          {canCreate && <NewHourlyWorkEntryButton hourlyContractId={contract.id} />}
        </div>
      </div>

      <div className="overflow-x-auto p-6">
        <div className="grid min-w-fit gap-4 border-b border-grid-border px-4 py-2 text-xs font-medium text-secondary" style={{ gridTemplateColumns: HOURLY_ENTRY_GRID_TEMPLATE }}>
          <span>Descrizione</span>
          <span>Riferimento</span>
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
