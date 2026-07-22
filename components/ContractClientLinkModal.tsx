'use client';

import { useMemo, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import { linkContractToClientAction } from '@/lib/actions/contracts';
import { notify } from '@/lib/notify';

export default function ContractClientLinkModal({
  contractId,
  contractClientName,
  clientOptions,
  onClose,
}: {
  contractId: string;
  contractClientName: string;
  clientOptions: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientOptions.slice(0, 20);
    return clientOptions.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, clientOptions]);

  function handleLink(clientId: string) {
    setLinkingId(clientId);
    startTransition(async () => {
      await linkContractToClientAction(contractId, clientId);
      notify('Contratto collegato al cliente.');
      router.refresh();
      onClose();
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-link-modal-title"
        className="modal-panel card-shadow w-full max-w-md rounded-xl border border-grid-border bg-card-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="contract-link-modal-title" className="text-sm font-semibold text-primary">
              Collega a un cliente
            </h2>
            <p className="mt-1 text-xs text-secondary">Contratto: {contractClientName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="relative mt-4">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca cliente per nome..."
            autoFocus
            className="w-full rounded-lg border border-grid-border bg-transparent py-2 pl-9 pr-3 text-sm text-primary"
          />
        </div>

        <ul className="mt-3 max-h-72 divide-y divide-grid-border overflow-y-auto rounded-lg border border-grid-border">
          {results.length === 0 && <li className="px-3 py-3 text-xs text-secondary">Nessun cliente trovato.</li>}
          {results.map((client) => (
            <li key={client.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-primary">{client.name}</span>
              <button
                type="button"
                onClick={() => handleLink(client.id)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
              >
                {isPending && linkingId === client.id ? (
                  <Loader2 size={13} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Link2 size={13} strokeWidth={1.75} aria-hidden="true" />
                )}
                Collega
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
