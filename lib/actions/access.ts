'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getUserByEmail, updateUserRole } from '@/lib/db';

async function requireSuperadmin() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (role !== 'superadmin' || !userId) {
    throw new Error('Solo un superadmin può gestire gli accessi.');
  }
  return userId;
}

/**
 * Concede accesso superadmin a un utente esistente (già registrato/loggato almeno
 * una volta), individuato per email. Non crea nuovi utenti: la persona deve aver
 * già effettuato il primo accesso (invitata come admin/dipendente in precedenza).
 */
export async function grantSuperadminByEmailAction(
  email: string
): Promise<{ success: boolean; message: string }> {
  await requireSuperadmin();

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { success: false, message: 'Inserisci un indirizzo email.' };
  }

  const user = await getUserByEmail(trimmed);
  if (!user) {
    return {
      success: false,
      message: 'Nessun utente trovato con questa email. Deve aver già effettuato il primo accesso a LNON.',
    };
  }

  if (user.role === 'superadmin') {
    return { success: false, message: `${user.name} ha già accesso superadmin.` };
  }

  await updateUserRole(user.id, 'superadmin');
  revalidatePath('/dashboard/settings/access');
  return { success: true, message: `${user.name} ora ha accesso superadmin.` };
}

/**
 * Revoca l'accesso superadmin di un utente, riportandolo ad admin.
 * Un superadmin non può revocare se stesso (per evitare di restare bloccati fuori).
 */
export async function revokeSuperadminAction(userId: string): Promise<{ success: boolean; message: string }> {
  const currentUserId = await requireSuperadmin();

  if (userId === currentUserId) {
    return { success: false, message: 'Non puoi revocare il tuo stesso accesso superadmin.' };
  }

  await updateUserRole(userId, 'admin');
  revalidatePath('/dashboard/settings/access');
  return { success: true, message: 'Accesso superadmin revocato.' };
}
