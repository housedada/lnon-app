'use client';

import { useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { createProjectFromJobAction } from '@/lib/actions/projects';
import { notify } from '@/lib/notify';
import AssignedToPicker from '@/components/AssignedToPicker';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';

export default function CreateProjectFromJobModal({
  jobId,
  jobTitle,
  userOptions,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  userOptions: { id: string; name: string; color?: string }[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createProjectFromJobAction(jobId, formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        onClose();
      }
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow w-full max-w-lg overflow-hidden rounded-xl border border-grid-border bg-card-bg"
      >
        <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b border-grid-border bg-grid-header-bg px-8 py-5">
          <ParticleCanvasHeader />
          <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-primary">
            <FolderPlus size={16} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            Genera progetto
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Chiudi"
            className="relative z-10 text-secondary transition hover:text-primary"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-8">
          <div className="field-wrap">
            <input
              type="text"
              name="title"
              id="project-title"
              defaultValue={jobTitle}
              placeholder=" "
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
            />
            <label htmlFor="project-title" className="field-floating-label">
              Titolo progetto
            </label>
          </div>

          <div className="mt-6">
            <AssignedToPicker userOptions={userOptions} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-grid-border px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
            Crea progetto
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
