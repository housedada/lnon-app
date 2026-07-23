'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Plus, X, Loader2 } from 'lucide-react';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';
import AssignedToPicker from '@/components/AssignedToPicker';
import { createProjectAction } from '@/lib/actions/projects';
import { notify } from '@/lib/notify';

export default function NewProjectButton({ userOptions }: { userOptions: { id: string; name: string; color?: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createProjectAction(formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Nuovo progetto"
        title="Nuovo progetto"
        className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
      >
        <Plus size={15} strokeWidth={2} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : () => setOpen(false)}>
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="modal-panel card-shadow w-full max-w-lg overflow-hidden rounded-xl bg-card-bg"
            >
              <div className="modal-header-gradient relative flex items-center justify-between gap-3 overflow-hidden px-8 py-5">
                <ParticleCanvasHeader />
                <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
                  <Plus size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
                  Nuovo progetto
                </h2>
                <button type="button" onClick={() => setOpen(false)} disabled={isPending} aria-label="Chiudi" className="relative z-10 text-white/70 transition hover:text-white">
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="p-8">
                <div className="field-wrap">
                  <input
                    type="text"
                    name="title"
                    id="new-project-title"
                    placeholder=" "
                    className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
                  />
                  <label htmlFor="new-project-title" className="field-floating-label">
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
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
                >
                  Annulla
                </button>
                <button type="submit" disabled={isPending} className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
                  {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
                  Crea progetto
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
