'use client';

import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import ContractForm from '@/components/ContractForm';
import { createContractAction } from '@/lib/actions/contracts';

export default function NewContractButton({ clientOptions }: { clientOptions: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo Contratto
      </button>
      {open && (
        <FormPageModal
          title="Nuovo Contratto"
          icon={<FileText size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <ContractForm clientOptions={clientOptions} action={createContractAction} />
        </FormPageModal>
      )}
    </>
  );
}
