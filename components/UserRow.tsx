'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Ban, RotateCcw, Trash2, Clock } from 'lucide-react';
import UserFormModal from '@/components/UserFormModal';
import SimpleConfirmModal from '@/components/SimpleConfirmModal';
import RowActionsCell from '@/components/RowActionsCell';
import RoleIcon, { ROLE_LABEL } from '@/components/RoleIcon';
import { setUserActiveAction, deleteUserAction } from '@/lib/actions/users';
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
    <div className="group contents">
      <div className="list-row-cell flex items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: user.color || '#999' }} aria-hidden="true" />
      </div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">
        {user.name}
      </div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {user.email}
      </div>
      <div className="list-row-cell flex items-center gap-1.5 whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        <RoleIcon role={user.role} />
        {ROLE_LABEL[user.role]}
      </div>
      <div className="list-row-cell flex items-center gap-1.5 whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
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
        {!pendingFirstLogin && user.isActive && <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-[11px] font-medium text-green-700">Attivo</span>}
      </div>

      <RowActionsCell>
        {canUpdate && (
          <UserFormModal
            mode="edit"
            user={user}
            trigger={(open) => (
              <button type="button" onClick={open} aria-label="Modifica utente" title="Modifica utente" className="text-secondary transition hover:text-primary">
                <Pencil size={15} strokeWidth={1.75} />
              </button>
            )}
          />
        )}
        {canUpdate && !isSelf && (
          <button
            type="button"
            onClick={() => setConfirm(user.isActive ? 'suspend' : 'reactivate')}
            aria-label={user.isActive ? 'Sospendi utente' : 'Riattiva utente'}
            title={user.isActive ? 'Sospendi utente' : 'Riattiva utente'}
            className="text-secondary transition hover:text-primary"
          >
            {user.isActive ? <Ban size={15} strokeWidth={1.75} /> : <RotateCcw size={15} strokeWidth={1.75} />}
          </button>
        )}
        {canDelete && !isSelf && (
          <button
            type="button"
            onClick={() => setConfirm('delete')}
            aria-label="Elimina utente"
            title="Elimina utente"
            className="text-secondary transition hover:text-red-600"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        )}
      </RowActionsCell>

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
    </div>
  );
}
