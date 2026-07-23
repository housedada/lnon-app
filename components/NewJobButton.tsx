'use client';

import { useState } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import JobForm from '@/components/JobForm';
import { createJobAction } from '@/lib/actions/jobs';

export default function NewJobButton({
  clientOptions,
  contractOptions,
  productOptions,
  userOptions,
}: {
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo Lavoro
      </button>
      {open && (
        <FormPageModal
          title="Nuovo Lavoro"
          icon={<Briefcase size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <JobForm
            clientOptions={clientOptions}
            contractOptions={contractOptions}
            productOptions={productOptions}
            userOptions={userOptions}
            action={createJobAction}
          />
        </FormPageModal>
      )}
    </>
  );
}
