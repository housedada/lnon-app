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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary"
      >
        <Link2 size={15} strokeWidth={1.75} aria-hidden="true" />
        Collega a cliente
      </button>
      {open && <JobClientLinkModal jobId={jobId} jobClientName={jobClientName} clientOptions={clientOptions} onClose={() => setOpen(false)} />}
    </>
  );
}
