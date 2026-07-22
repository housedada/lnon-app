'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { importAllFicProductsAction } from '@/lib/actions/fic';

export default function ImportFicProductsButton() {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState<number | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const imported = await importAllFicProductsAction();
      setCount(imported);
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
          <Download size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
        {isPending ? 'Importazione in corso...' : 'Importa da Fatture in Cloud'}
      </button>
      {count !== null && <span className="text-xs text-secondary">{count} prodotti importati/aggiornati</span>}
    </div>
  );
}
