'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import JobClientLinkModal from '@/components/JobClientLinkModal';

export default function JobLinkButton({
  jobId,
  jobClientName,
  clientOptions,
}: {
  jobId: string;
  jobClientName: string;
  clientOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Collega a un cliente" className="text-secondary transition hover:text-primary">
        <Link2 size={15} strokeWidth={1.75} />
      </button>
      {open && <JobClientLinkModal jobId={jobId} jobClientName={jobClientName} clientOptions={clientOptions} onClose={() => setOpen(false)} />}
    </>
  );
}
