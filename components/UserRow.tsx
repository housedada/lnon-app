'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Clock } from 'lucide-react';
import UserFormModal from '@/components/UserFormModal';
import SimpleConfirmModal from '@/components/SimpleConfirmModal';
import RowActionsCell from '@/components/RowActionsCell';
import InlineSelectCell, { type InlineSelectOption } from '@/components/InlineSelectCell';
import InlineColorCell from '@/components/InlineColorCell';
import RoleIcon, { ROLE_LABEL } from '@/components/RoleIcon';
import { setUserActiveAction, setUserColorAction, deleteUserAction } from '@/lib/actions/users';
import { notify } from '@/lib/notify';
import type { User } from '@/lib/types';

type ActiveState = 'active' | 'suspended';

const ACTIVE_STATE_OPTIONS: InlineSelectOption<ActiveState>[] = [
  { value: 'active', label: 'Attivo', badgeClassName: 'bg-green-600/10 text-green-700' },
  { value: 'suspended', label: 'Sospeso', badgeClassName: 'bg-red-600/10 text-red-700' },
];

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  const pendingFirstLogin = !user.googleId;

  async function handleDeleteConfirm() {
    const res = await deleteUserAction(user.id);
    notify(res.message);
    setConfirmDelete(false);
    router.refresh();
  }

  async function handleActiveStateSave(next: ActiveState) {
    return setUserActiveAction(user.id, next === 'active');
  }

  return (
    <div className="group contents">
      <div className="list-row-cell flex items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
        {canUpdate ? (
          <InlineColorCell value={user.color || ''} onSave={setUserColorAction.bind(null, user.id)} />
        ) : (
          <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: user.color || '#999' }} aria-hidden="true" />
        )}
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
        {canUpdate && !isSelf ? (
          <InlineSelectCell value={user.isActive ? 'active' : 'suspended'} options={ACTIVE_STATE_OPTIONS} onSave={handleActiveStateSave} />
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${user.isActive ? 'bg-green-600/10 text-green-700' : 'bg-red-600/10 text-red-600'}`}>
            {user.isActive ? 'Attivo' : 'Sospeso'}
          </span>
        )}
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
        {canDelete && !isSelf && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Elimina utente"
            title="Elimina utente"
            className="text-secondary transition hover:text-red-600"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        )}
      </RowActionsCell>

      {confirmDelete && (
        <SimpleConfirmModal
          title="Elimina utente"
          message={`Stai per eliminare “${user.name}”. L'email tornerà disponibile per un nuovo utente.`}
          confirmLabel="Elimina"
          onConfirm={handleDeleteConfirm}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
