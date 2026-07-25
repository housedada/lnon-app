'use client';

import Link from 'next/link';
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

export default function HourlyContractRow({ contract }: { contract: HourlyContract }) {
  return (
    <Link
      href={`/dashboard/contracts/hourly/${contract.id}`}
      className="grid grid-cols-6 items-center gap-3 border-b border-grid-border px-4 py-3 text-sm text-primary transition hover:bg-row-hover"
    >
      <span>
        <span className="font-bold text-primary">{contract.referenceName || contract.clientName || '—'}</span>
        {contract.referenceName && <span className="ml-1 text-xs text-secondary">- {contract.clientName}</span>}
      </span>
      <span className="capitalize">
        {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
      </span>
      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>
        {STATUS_LABEL[contract.status]}
      </span>
      <span>{contract.entriesCount ?? 0}</span>
      <span>{formatDate(contract.lastEntryDate)}</span>
      <span className="text-right font-medium">{formatEuro(contract.totalAmount)}</span>
    </Link>
  );
}
