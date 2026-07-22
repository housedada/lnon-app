'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { updateUserColor } from '@/lib/db';
import { USER_TAG_COLORS } from '@/lib/types';

export async function updateUserColorAction(color: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return { success: false, message: 'Sessione non valida.' };
  }
  if (!USER_TAG_COLORS.includes(color as (typeof USER_TAG_COLORS)[number])) {
    return { success: false, message: 'Colore non valido.' };
  }

  await updateUserColor(userId, color);
  revalidatePath('/dashboard', 'layout');
  return { success: true, message: 'Colore aggiornato.' };
}
