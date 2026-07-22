'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { bulkMatchClientsAction } from '@/lib/actions/fic';

export default function BulkMatchClientsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ matched: number; unmatched: number } | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await bulkMatchClientsAction();
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
        {isPending ? 'Sincronizzazione in corso...' : 'Sincronizza tutti (match automatico)'}
      </button>
      {result && (
        <span className="text-xs text-secondary">
          {result.matched} collegati, {result.unmatched} senza corrispondenza
        </span>
      )}
    </div>
  );
}
