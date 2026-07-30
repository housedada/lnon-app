'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Plus, Pencil, Loader2, Check, Shuffle } from 'lucide-react';
import { createUserAction, updateUserAction } from '@/lib/actions/users';
import { notify } from '@/lib/notify';
import { USER_TAG_COLORS, type User, type UserRole } from '@/lib/types';
import { ROLE_LABEL } from '@/components/RoleIcon';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';

function randomColor(exclude?: string): string {
  const pool = USER_TAG_COLORS.filter((c) => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? USER_TAG_COLORS[0];
}

const ROLES: UserRole[] = ['dipendente', 'admin', 'superadmin'];

export default function UserFormModal({
  mode,
  user,
  trigger,
}: {
  mode: 'create' | 'edit';
  user?: User;
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(() => user?.color ?? randomColor());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function close() {
    if (isPending) return;
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('color', color);
    startTransition(async () => {
      const res = mode === 'create' ? await createUserAction(formData) : await updateUserAction(user!.id, formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Nuovo utente
        </button>
      )}

      {open &&
        createPortal(
          <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={close}>
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="modal-panel card-shadow w-full max-w-md overflow-hidden rounded-xl bg-card-bg"
            >
              <div className="modal-header-gradient relative flex items-center justify-between gap-3 overflow-hidden px-8 py-5">
                <ParticleCanvasHeader />
                <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
                  {mode === 'create' ? (
                    <Plus size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
                  ) : (
                    <Pencil size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
                  )}
                  {mode === 'create' ? 'Nuovo utente' : 'Modifica utente'}
                </h2>
                <button type="button" onClick={close} disabled={isPending} aria-label="Chiudi" className="relative z-10 text-white/70 transition hover:text-white">
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex flex-col gap-4 p-8">
                <div className="field-wrap">
                  <input
                    type="text"
                    name="name"
                    id="user-name"
                    defaultValue={user?.name}
                    autoFocus
                    required
                    placeholder=" "
                    className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
                  />
                  <label htmlFor="user-name" className="field-floating-label">
                    Nome
                  </label>
                </div>

                <div className="field-wrap">
                  <input
                    type="email"
                    name="email"
                    id="user-email"
                    defaultValue={user?.email}
                    required
                    placeholder=" "
                    className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
                  />
                  <label htmlFor="user-email" className="field-floating-label">
                    Email (Google)
                  </label>
                </div>

                <div className="field-wrap">
                  <select
                    name="role"
                    id="user-role"
                    defaultValue={user?.role ?? 'dipendente'}
                    className="field-input w-full appearance-none border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="user-role" className="field-floating-label">
                    Ruolo
                  </label>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="detail-label">Colore tag</p>
                    <button
                      type="button"
                      onClick={() => setColor((c) => randomColor(c))}
                      className="flex items-center gap-1 text-[11px] text-secondary transition hover:text-primary"
                    >
                      <Shuffle size={12} strokeWidth={1.75} aria-hidden="true" />
                      Casuale
                    </button>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {USER_TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Seleziona colore ${c}`}
                        aria-pressed={color === c}
                        className="flex h-6 w-6 items-center justify-center rounded-full transition hover:scale-110"
                        style={{ background: c }}
                      >
                        {color === c && <Check size={12} strokeWidth={2.5} className="text-neutral-700" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-grid-border px-8 py-5">
                <button
                  type="button"
                  onClick={close}
                  disabled={isPending}
                  className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
                >
                  Annulla
                </button>
                <button type="submit" disabled={isPending} className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
                  {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
                  {mode === 'create' ? 'Crea utente' : 'Salva modifiche'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
