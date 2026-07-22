'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { suggestJobClientMatchesAction, type JobClientMatchSuggestion } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';
import JobClientMatchModal from '@/components/JobClientMatchModal';

export default function SyncJobsClientsButton() {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<JobClientMatchSuggestion[] | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await suggestJobClientMatchesAction();
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
        aria-label="Sincronizza lavori con anagrafica clienti"
        title="Cerca corrispondenze per nome tra lavori e clienti"
        className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
        Sincronizza clienti
      </button>

      {suggestions && <JobClientMatchModal suggestions={suggestions} onClose={() => setSuggestions(null)} />}
    </>
  );
}
