'use client';

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import HourlyWorkEntryForm from '@/components/HourlyWorkEntryForm';
import { createHourlyWorkEntryAction } from '@/lib/actions/hourlyBilling';

export default function NewHourlyWorkEntryButton({ hourlyContractId }: { hourlyContractId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuova lavorazione
      </button>
      {open && (
        <FormPageModal
          title="Nuova lavorazione"
          icon={<Clock size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <HourlyWorkEntryForm action={createHourlyWorkEntryAction.bind(null, hourlyContractId)} />
        </FormPageModal>
      )}
    </>
  );
}
