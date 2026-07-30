import RowActionsCell from '@/components/RowActionsCell';
import RevokeAccessButton from '@/components/RevokeAccessButton';
import RevokeAdminButton from '@/components/RevokeAdminButton';
import RoleIcon, { ROLE_LABEL } from '@/components/RoleIcon';
import type { User } from '@/lib/types';

export default function ElevatedUserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
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
      <RowActionsCell>
        {!isSelf && user.role === 'superadmin' && <RevokeAccessButton userId={user.id} />}
        {!isSelf && user.role === 'admin' && <RevokeAdminButton userId={user.id} />}
      </RowActionsCell>
    </div>
  );
}
