import { ShieldCheck, UserRound } from 'lucide-react';
import CrownIcon from '@/components/CrownIcon';
import type { UserRole } from '@/lib/types';

export const ROLE_LABEL: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Amministratore',
  dipendente: 'Dipendente',
};

export default function RoleIcon({ role }: { role: UserRole }) {
  if (role === 'superadmin') return <CrownIcon size={15} />;
  if (role === 'admin') return <ShieldCheck size={15} strokeWidth={2} className="text-sky-500" aria-hidden="true" />;
  return <UserRound size={15} strokeWidth={2} className="text-secondary" aria-hidden="true" />;
}
