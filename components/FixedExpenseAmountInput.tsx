'use client';

import { useState, useTransition } from 'react';
import { upsertFixedExpenseEntryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function FixedExpenseAmountInput({
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
  const [value, setValue] = useState(String(amount));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const num = Number(value);
    if (!Number.isFinite(num) || num === amount) {
      setValue(String(amount));
      return;
    }
    startTransition(async () => {
      const res = await upsertFixedExpenseEntryAction({ categoryId, fiscalYear, amount: num, isActive });
      if (!res.success) {
        notify(res.message);
        setValue(String(amount));
      }
    });
  }

  return (
    <input
      type="number"
      min={0}
      step="0.01"
      value={value}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`field-input w-32 rounded border border-grid-border bg-transparent px-2 py-1 text-right text-sm disabled:opacity-50 ${
        isActive ? 'text-primary' : 'text-secondary line-through'
      }`}
    />
  );
}
