'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import ContractClientLinkModal from '@/components/ContractClientLinkModal';

export default function ContractLinkButton({
  contractId,
  contractClientName,
  clientOptions,
}: {
  contractId: string;
  contractClientName: string;
  clientOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Collega a un cliente"
        className="text-secondary transition hover:text-primary"
      >
        <Link2 size={15} strokeWidth={1.75} />
      </button>
      {open && (
        <ContractClientLinkModal
          contractId={contractId}
          contractClientName={contractClientName}
          clientOptions={clientOptions}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
