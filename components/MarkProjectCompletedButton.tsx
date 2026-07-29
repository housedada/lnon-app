'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import SimpleConfirmModal from '@/components/SimpleConfirmModal';
import { markProjectCompletedAction } from '@/lib/actions/projects';
import { notify } from '@/lib/notify';

export default function MarkProjectCompletedButton({
  projectId,
  projectTitle,
  isHourlyContract,
}: {
  projectId: string;
  projectTitle: string;
  isHourlyContract?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await markProjectCompletedAction(projectId);
      notify(
        res.message,
        isHourlyContract && res.success
          ? { durationMs: 6000, href: '/dashboard/contracts/hourly', linkLabel: 'Vai a Conteggio Orario' }
          : undefined
      );
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
        className="project-completed-btn flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition disabled:opacity-60"
      >
        <CheckCircle2 size={12} strokeWidth={2.25} className="text-white" aria-hidden="true" />
      </button>
      {open && isHourlyContract && (
        <SimpleConfirmModal
          message={`Completando "${projectTitle}" metti in riposo il contratto a conteggio orario collegato: la lavorazione in corso verrà chiusa. Confermi?`}
          confirmLabel="Completa"
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
      {open && !isHourlyContract && (
        <DoubleConfirmModal
          firstMessage={`Segnare il progetto "${projectTitle}" come completato?`}
          secondMessage="Il completamento non cambia lo stato di fatturazione del lavoro: quando sarà fatturato, aggiorna manualmente lo stato del lavoro. Confermi?"
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
