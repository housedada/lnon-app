import type { Contract } from '@/lib/types';

function formatDate(value?: Date): string {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

function daysUntil(value?: Date): number {
  if (!value) return 0;
  return Math.ceil((value.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ProviderExpirationsSection({ contracts }: { contracts: Contract[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Scadenze provider nei prossimi 30 giorni
      </p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        {contracts.length === 0 ? (
          <p className="py-2 text-xs text-secondary">Nessuna scadenza nei prossimi 30 giorni.</p>
        ) : (
          <ul className="space-y-2">
            {contracts.map((contract) => (
              <li key={contract.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate text-primary">
                  {contract.clientName ?? contract.clientNameRaw} · {contract.provider}
                  {contract.providerPlan ? ` (${contract.providerPlan})` : ''}
                </span>
                <span className="shrink-0 pl-3 text-xs text-secondary">
                  {formatDate(contract.providerExpiryDate)} · {daysUntil(contract.providerExpiryDate)}gg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
