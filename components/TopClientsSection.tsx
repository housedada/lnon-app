import { Users } from 'lucide-react';
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TopClientsSection({ topClients }: { topClients: JobsForecastResult['topClients'] }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-secondary">
        <Users size={11} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
        Top 5 clienti per fatturato
      </p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        {topClients.length === 0 ? (
          <p className="py-2 text-xs text-secondary">Nessuna fattura emessa.</p>
        ) : (
          <ol className="space-y-2">
            {topClients.map((client, i) => (
              <li key={`${i}-${client.clientName}`} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate text-primary">
                  <span className="text-xs text-secondary">{i + 1}.</span>
                  {client.clientName}
                </span>
                <span className="shrink-0 pl-3 font-medium text-primary">{formatExact(client.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
