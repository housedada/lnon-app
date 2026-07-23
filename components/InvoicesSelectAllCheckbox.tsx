'use client';

import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';

export default function InvoicesSelectAllCheckbox({ invoiceIds }: { invoiceIds: string[] }) {
  const selected = useProjectInvoicesSelectionStore((s) => s.selected);
  const selectMany = useProjectInvoicesSelectionStore((s) => s.selectMany);

  const allSelected = invoiceIds.length > 0 && invoiceIds.every((id) => selected.includes(id));

  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={() => selectMany(invoiceIds)}
      aria-label="Seleziona tutte le fatture"
    />
  );
}
