'use client';

import { useTransition } from 'react';
import { upsertFixedExpenseEntryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function FixedExpenseActiveToggle({
  categoryId,
  fiscalYear,
  amount,
  isActive,
}: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await upsertFixedExpenseEntryAction({ categoryId, fiscalYear, amount, isActive: !isActive });
      if (!res.success) notify(res.message);
    });
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-secondary">
      <input type="checkbox" checked={isActive} disabled={isPending} onChange={toggle} className="cursor-pointer" />
      Incluso nel totale
    </label>
  );
}
