'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { generateDemoData, clearDemoData } from '@/lib/db';

async function requireAdmin(): Promise<string> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || role === 'dipendente') {
    throw new Error('Solo gli amministratori possono gestire i dati demo.');
  }
  return userId;
}

export async function generateDemoDataAction(): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireAdmin();
    await generateDemoData(userId);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Dati demo generati.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella generazione dei dati demo.' };
  }
}

export async function clearDemoDataAction(): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    await clearDemoData();
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Dati demo eliminati.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'eliminazione dei dati demo.' };
  }
}
