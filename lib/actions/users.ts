'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { createUserRecord, updateUserRecord, setUserActive, softDeleteUser, getUserByEmail } from '@/lib/db';
import { USER_TAG_COLORS, type UserRole } from '@/lib/types';

async function requireRole(action: string) {
  const session = await auth();
  const role = (session?.user as { role?: UserRole } | undefined)?.role;
  if (!role || !hasPermission(role, 'users', action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return role;
}

const UserSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  email: z.string().email('Email non valida'),
  role: z.enum(['superadmin', 'admin', 'dipendente']),
  color: z.string().refine((c) => (USER_TAG_COLORS as readonly string[]).includes(c), 'Colore non valido'),
});

export async function createUserAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('create');
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = UserSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dati non validi.' };
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    return { success: false, message: 'Esiste già un utente con questa email.' };
  }

  await createUserRecord(parsed.data);
  revalidatePath('/dashboard/users');
  return { success: true, message: 'Utente creato. Si attiverà al primo accesso Google con questa email.' };
}

export async function updateUserAction(userId: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('update');
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = UserSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dati non validi.' };
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing && existing.id !== userId) {
    return { success: false, message: 'Esiste già un altro utente con questa email.' };
  }

  await updateUserRecord(userId, parsed.data);
  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard', 'layout');
  return { success: true, message: 'Utente aggiornato.' };
}

export async function setUserColorAction(userId: string, color: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('update');
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
  if (!(USER_TAG_COLORS as readonly string[]).includes(color)) {
    return { success: false, message: 'Colore non valido.' };
  }

  await updateUserRecord(userId, { color });
  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard', 'layout');
  return { success: true, message: 'Colore aggiornato.' };
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('deactivate');
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }

  const session = await auth();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (currentUserId === userId) {
    return { success: false, message: 'Non puoi sospendere il tuo stesso account.' };
  }

  await setUserActive(userId, isActive);
  revalidatePath('/dashboard/users');
  return { success: true, message: isActive ? 'Utente riattivato.' : 'Utente sospeso.' };
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: UserRole } | undefined)?.role;
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !canDeleteResource(role, '', '', 'users')) {
    return { success: false, message: 'Solo un superadmin può eliminare un utente.' };
  }
  if (currentUserId === userId) {
    return { success: false, message: 'Non puoi eliminare il tuo stesso account.' };
  }

  await softDeleteUser(userId);
  revalidatePath('/dashboard/users');
  return { success: true, message: 'Utente eliminato.' };
}
