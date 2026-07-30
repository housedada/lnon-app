'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Ban, RotateCcw, Trash2, Clock } from 'lucide-react';
import UserFormModal from '@/components/UserFormModal';
import SimpleConfirmModal from '@/components/SimpleConfirmModal';
import { setUserActiveAction, deleteUserAction } from '@/lib/actions/users';
import { getRoleLabel } from '@/lib/permissions';
import { notify } from '@/lib/notify';
import type { User } from '@/lib/types';

export default function UserRow({
  user,
  canUpdate,
  canDelete,
  isSelf,
}: {
  user: User;
  canUpdate: boolean;
  canDelete: boolean;
  isSelf: boolean;
}) {
  const [confirm, setConfirm] = useState<'suspend' | 'reactivate' | 'delete' | null>(null);
  const router = useRouter();

  const pendingFirstLogin = !user.googleId;

  async function handleConfirm() {
    if (confirm === 'delete') {
      const res = await deleteUserAction(user.id);
      notify(res.message);
    } else if (confirm) {
      const res = await setUserActiveAction(user.id, confirm === 'reactivate');
      notify(res.message);
    }
    setConfirm(null);
    router.refresh();
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: user.color || '#999' }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-primary">{user.name}</p>
        <p className="truncate text-xs text-secondary">
          {user.email} · {getRoleLabel(user.role)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {pendingFirstLogin && (
          <span title="In attesa del primo accesso" className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
            <Clock size={11} strokeWidth={2} aria-hidden="true" />
            In attesa
          </span>
        )}
        {!user.isActive && (
          <span title="Account sospeso" className="rounded-full bg-red-600/10 px-2 py-0.5 text-[11px] font-medium text-red-600">
            Sospeso
          </span>
        )}

        {canUpdate && (
          <UserFormModal
            mode="edit"
            user={user}
            trigger={(open) => (
              <button type="button" onClick={open} aria-label="Modifica utente" title="Modifica" className="text-secondary transition hover:text-primary">
                <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          />
        )}

        {canUpdate && !isSelf && (
          <button
            type="button"
            onClick={() => setConfirm(user.isActive ? 'suspend' : 'reactivate')}
            aria-label={user.isActive ? 'Sospendi utente' : 'Riattiva utente'}
            title={user.isActive ? 'Sospendi' : 'Riattiva'}
            className="text-secondary transition hover:text-primary"
          >
            {user.isActive ? <Ban size={15} strokeWidth={1.75} aria-hidden="true" /> : <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        )}

        {canDelete && !isSelf && (
          <button
            type="button"
            onClick={() => setConfirm('delete')}
            aria-label="Elimina utente"
            title="Elimina"
            className="text-secondary transition hover:text-red-600"
          >
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      {confirm && (
        <SimpleConfirmModal
          title={confirm === 'delete' ? 'Elimina utente' : confirm === 'suspend' ? 'Sospendi utente' : 'Riattiva utente'}
          message={
            confirm === 'delete'
              ? `Stai per eliminare “${user.name}”. L'email tornerà disponibile per un nuovo utente.`
              : confirm === 'suspend'
                ? `“${user.name}” non potrà più accedere fino a riattivazione.`
                : `“${user.name}” potrà tornare ad accedere.`
          }
          confirmLabel={confirm === 'delete' ? 'Elimina' : confirm === 'suspend' ? 'Sospendi' : 'Riattiva'}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </li>
  );
}
