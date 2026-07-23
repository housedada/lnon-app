'use client';

import { useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import ClientForm from '@/components/ClientForm';
import { createClientAction } from '@/lib/actions/clients';

export default function NewClientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo Cliente
      </button>
      {open && (
        <FormPageModal
          title="Nuovo Cliente"
          icon={<Building2 size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <ClientForm action={createClientAction} />
        </FormPageModal>
      )}
    </>
  );
}
