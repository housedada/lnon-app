'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteFixedExpenseCategoryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function DeleteFixedExpenseCategoryButton({ categoryId, categoryLabel }: { categoryId: string; categoryLabel: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await deleteFixedExpenseCategoryAction(categoryId);
      notify(res.message);
      setOpen(false);
      if (res.success) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Elimina categoria ${categoryLabel}`}
        title="Elimina categoria"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <DoubleConfirmModal
          firstMessage={`Eliminare la categoria "${categoryLabel}"?`}
          secondMessage="Verrà nascosta da questa pagina insieme a tutto il suo storico di importi per ogni anno. Confermi?"
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
