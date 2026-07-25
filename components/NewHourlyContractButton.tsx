'use client';

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import HourlyContractForm from '@/components/HourlyContractForm';
import { createHourlyContractAction } from '@/lib/actions/hourlyBilling';

export default function NewHourlyContractButton({ clientOptions }: { clientOptions: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo contratto orario
      </button>
      {open && (
        <FormPageModal
          title="Nuovo contratto a conteggio orario"
          icon={<Clock size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <HourlyContractForm clientOptions={clientOptions} action={createHourlyContractAction} />
        </FormPageModal>
      )}
    </>
  );
}
