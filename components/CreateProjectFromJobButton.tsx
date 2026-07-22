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
        className="relative flex h-6 w-6 items-center justify-center rounded-full bg-neutral-500/10 transition hover:bg-neutral-500/20"
      >
        <FolderPlus size={12} strokeWidth={2} style={{ color: 'var(--accent-to)' }} aria-hidden="true" />
      </button>
      {open && (
        <CreateProjectFromJobModal jobId={jobId} jobTitle={jobTitle} userOptions={userOptions} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
