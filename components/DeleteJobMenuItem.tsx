'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteJobFromListAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';

export default function DeleteJobMenuItem({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    const res = await deleteJobFromListAction(jobId);
    notify(res.message);
    setOpen(false);
    if (res.success) router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-600/5"
      >
        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        Elimina lavoro
      </button>
      {open && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare il lavoro "${jobTitle}"?`}
          secondMessage="Confermi in modo definitivo? Il lavoro (e i sotto task collegati) verrà spostato nel cestino: potrai ripristinarlo in seguito."
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
