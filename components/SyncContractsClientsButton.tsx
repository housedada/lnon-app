'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { suggestContractClientMatchesAction, type ContractClientMatchSuggestion } from '@/lib/actions/contracts';
import { notify } from '@/lib/notify';
import ContractClientMatchModal from '@/components/ContractClientMatchModal';

export default function SyncContractsClientsButton() {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<ContractClientMatchSuggestion[] | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await suggestContractClientMatchesAction();
      if (res.length === 0) {
        notify('Nessun nuovo abbinamento trovato.');
      } else {
        setSuggestions(res);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Sincronizza contratti con anagrafica clienti"
        title="Cerca corrispondenze per nome tra contratti e clienti"
        className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
        Sincronizza clienti
      </button>

      {suggestions && <ContractClientMatchModal suggestions={suggestions} onClose={() => setSuggestions(null)} />}
    </>
  );
}
