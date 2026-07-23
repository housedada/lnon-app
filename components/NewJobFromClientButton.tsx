'use client';

import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import JobForm from '@/components/JobForm';
import { createJobAction } from '@/lib/actions/jobs';

export default function NewJobFromClientButton({
  clientId,
  clientOptions,
  contractOptions,
  productOptions,
  userOptions,
}: {
  clientId: string;
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
        aria-label="Nuovo lavoro per questo cliente"
        title="Nuovo lavoro per questo cliente"
        className="special-action-btn flex h-6 w-6 items-center justify-center rounded-full bg-neutral-500/10 transition hover:bg-neutral-500/20"
      >
        <Briefcase size={12} strokeWidth={2} className="special-action-icon" aria-hidden="true" />
      </button>
      {open && (
        <FormPageModal
          title="Nuovo Lavoro"
          icon={<Briefcase size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <JobForm
            defaultClientId={clientId}
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
