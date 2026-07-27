'use client';

import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import RowActionsCell from '@/components/RowActionsCell';
import NewHourlyWorkEntryButton from '@/components/NewHourlyWorkEntryButton';
import type { HourlyContract, HourlyContractStatus } from '@/lib/types';

const STATUS_LABEL: Record<HourlyContractStatus, string> = {
  in_corso: 'In corso',
  riposo: 'Riposo',
};

const STATUS_BADGE: Record<HourlyContractStatus, string> = {
  in_corso: 'bg-green-600/10 text-green-700',
  riposo: 'bg-sky-500/10 text-sky-700',
};

function formatEuro(value?: number): string {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date): string {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default function HourlyContractRow({ contract, canCreate }: { contract: HourlyContract; canCreate: boolean }) {
  const router = useRouter();

  function goToDetail() {
    router.push(`/dashboard/contracts/hourly/${contract.id}`);
  }

  return (
    <div className="group contents">
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className="font-semibold tracking-[0.01em] text-primary">{contract.referenceName || contract.clientName || '—'}</span>
        {contract.referenceName && <span className="ml-1 truncate text-xs text-secondary">- {contract.clientName}</span>}
      </div>
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary capitalize group-hover:bg-row-hover group-hover:text-primary">
        {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
      </div>
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>{STATUS_LABEL[contract.status]}</span>
      </div>
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {contract.entriesCount ?? 0}
      </div>
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {formatDate(contract.lastEntryDate)}
      </div>
      <div onClick={goToDetail} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-right font-semibold text-primary group-hover:bg-row-hover">
        {formatEuro(contract.totalAmount)}
      </div>

      <RowActionsCell>
        <button type="button" onClick={goToDetail} aria-label="Vedi dettaglio contratto" title="Vedi dettaglio contratto" className="text-secondary transition hover:text-primary">
          <Eye size={15} strokeWidth={1.75} />
        </button>
        {canCreate && <NewHourlyWorkEntryButton hourlyContractId={contract.id} compact />}
      </RowActionsCell>
    </div>
  );
}
