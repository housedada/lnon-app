'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Moon } from 'lucide-react';
import { restHourlyContractAction } from '@/lib/actions/hourlyBilling';
import { notify } from '@/lib/notify';

export default function RestHourlyContractButton({ hourlyContractId }: { hourlyContractId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await restHourlyContractAction(hourlyContractId);
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Completa l'ultima lavorazione e metti il contratto in riposo (si riattiva automaticamente alla prossima lavorazione)"
      className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-secondary transition hover:bg-row-hover hover:text-primary disabled:opacity-60"
    >
      <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
      Metti in riposo
    </button>
  );
}
