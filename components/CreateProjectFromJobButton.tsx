'use client';

import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';

export default function CreateProjectFromJobButton({
  jobId,
  jobTitle,
  userOptions,
  variant = 'icon',
}: {
  jobId: string;
  jobTitle: string;
  userOptions: { id: string; name: string; color?: string }[];
  variant?: 'icon' | 'menu-row';
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Genera progetto da questo lavoro"
          title="Genera progetto da questo lavoro"
          className="special-action-btn flex h-6 w-6 items-center justify-center rounded-full bg-neutral-500/10 transition hover:bg-neutral-500/20"
        >
          <FolderPlus size={13} strokeWidth={2} className="special-action-icon" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary"
        >
          <FolderPlus size={15} strokeWidth={1.75} aria-hidden="true" />
          Crea progetto
        </button>
      )}
      {open && (
        <CreateProjectFromJobModal jobId={jobId} jobTitle={jobTitle} userOptions={userOptions} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
