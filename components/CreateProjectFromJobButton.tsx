'use client';

import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';

export default function CreateProjectFromJobButton({
  jobId,
  jobTitle,
  userOptions,
}: {
  jobId: string;
  jobTitle: string;
  userOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Genera progetto da questo lavoro"
        title="Genera progetto da questo lavoro"
        className="relative flex h-6 w-6 items-center justify-center rounded-full transition hover:brightness-110"
        style={{ background: 'linear-gradient(180deg, var(--accent-from), var(--accent-to))' }}
      >
        <FolderPlus size={12} strokeWidth={2} className="text-primary opacity-90" aria-hidden="true" />
      </button>
      {open && (
        <CreateProjectFromJobModal jobId={jobId} jobTitle={jobTitle} userOptions={userOptions} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
