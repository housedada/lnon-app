'use client';

import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';

export default function InvoiceRowSelectCheckbox({ invoiceId }: { invoiceId: string }) {
  const checked = useProjectInvoicesSelectionStore((s) => s.selected.includes(invoiceId));
  const toggleSelect = useProjectInvoicesSelectionStore((s) => s.toggleSelect);

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => toggleSelect(invoiceId)}
      aria-label="Seleziona fattura"
    />
  );
}
