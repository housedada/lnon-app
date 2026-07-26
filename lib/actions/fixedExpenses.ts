'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createFixedExpenseCategory,
  softDeleteFixedExpenseCategory,
  upsertFixedExpenseEntry,
} from '@/lib/db';

async function requireRole(resource: string, action: string): Promise<{ role: 'superadmin' | 'admin' | 'dipendente'; userId: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return { role, userId };
}

export async function createFixedExpenseCategoryAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('fixed_expenses', 'create');
    const label = String(formData.get('label') || '').trim();
    if (!label) return { success: false, message: 'Il nome della categoria è obbligatorio.' };

    await createFixedExpenseCategory(label, userId);
    revalidatePath('/dashboard/spese-fisse');
    return { success: true, message: `Categoria "${label}" creata.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella creazione della categoria.' };
  }
}

export async function deleteFixedExpenseCategoryAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'fixed_expenses')) {
    return { success: false, message: 'Solo un superadmin può eliminare una categoria di spesa fissa.' };
  }

  await softDeleteFixedExpenseCategory(id);
  revalidatePath('/dashboard/spese-fisse');
  return { success: true, message: 'Categoria eliminata.' };
}

export async function upsertFixedExpenseEntryAction(input: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('fixed_expenses', 'update');

    if (!Number.isFinite(input.amount) || input.amount < 0) {
      return { success: false, message: "L'importo deve essere un numero maggiore o uguale a zero." };
    }

    await upsertFixedExpenseEntry({ ...input, updatedBy: userId });
    revalidatePath('/dashboard/spese-fisse');
    return { success: true, message: 'Importo aggiornato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento dell'importo." };
  }
}
