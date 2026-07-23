'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { markProjectCompletedAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';

export default function MarkProjectCompletedButton({
  projectId,
  projectTitle,
  budgetShare,
}: {
  projectId: string;
  projectTitle: string;
  budgetShare: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await markProjectCompletedAction(projectId);
      notify(res.message);
      setOpen(false);
      if (res.success) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={isPending}
        aria-label="Segna progetto come completato"
        title="Segna progetto come completato"
        className="special-action-btn flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-500/10 transition hover:bg-neutral-500/20"
      >
        <CheckCircle2 size={12} strokeWidth={2} className="special-action-icon" aria-hidden="true" />
      </button>
      {open && (
        <DoubleConfirmModal
          firstMessage={`Segnare il progetto "${projectTitle}" come completato?`}
          secondMessage={`Verrà generata una fattura per la quota ${budgetShare}% del budget del lavoro collegato, visibile agli admin nella pagina Fatture. Confermi?`}
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
