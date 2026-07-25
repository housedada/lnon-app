'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createHourlyContract,
  updateHourlyContract,
  softDeleteHourlyContract,
  createHourlyWorkEntry,
  updateHourlyWorkEntry,
  softDeleteHourlyWorkEntry,
} from '@/lib/db';
import type { HourlyRateType } from '@/lib/types';

async function requireRole(resource: string, action: string): Promise<{ userId: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return { userId };
}

export async function createHourlyContractAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('hourly_billing', 'create');
    const clientId = String(formData.get('clientId') || '');
    const referenceName = String(formData.get('referenceName') || '').trim() || undefined;
    const rateType = String(formData.get('rateType') || '') as HourlyRateType;
    const customHourlyRateRaw = formData.get('customHourlyRate');
    const customHourlyRate = customHourlyRateRaw ? Number(customHourlyRateRaw) : undefined;

    if (!clientId) return { success: false, message: 'Il cliente è obbligatorio.' };
    if (!['standard', 'cheap', 'custom'].includes(rateType)) return { success: false, message: 'Tipo tariffa non valido.' };
    if (rateType === 'custom' && (!customHourlyRate || customHourlyRate <= 0)) {
      return { success: false, message: 'Inserisci una tariffa oraria valida.' };
    }

    await createHourlyContract({ clientId, referenceName, rateType, customHourlyRate }, userId);
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Contratto a conteggio orario creato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella creazione del contratto.' };
  }
}

export async function updateHourlyContractAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('hourly_billing', 'update');
    const rateType = String(formData.get('rateType') || '') as HourlyRateType;
    const customHourlyRateRaw = formData.get('customHourlyRate');
    const customHourlyRate = customHourlyRateRaw ? Number(customHourlyRateRaw) : undefined;
    const status = String(formData.get('status') || 'in_corso') as 'in_corso' | 'non_in_corso';

    if (!['standard', 'cheap', 'custom'].includes(rateType)) return { success: false, message: 'Tipo tariffa non valido.' };
    if (rateType === 'custom' && (!customHourlyRate || customHourlyRate <= 0)) {
      return { success: false, message: 'Inserisci una tariffa oraria valida.' };
    }

    await updateHourlyContract(id, { rateType, customHourlyRate, status });
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Contratto aggiornato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento del contratto." };
  }
}

export async function deleteHourlyContractAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'hourly_billing')) {
    return { success: false, message: 'Solo un superadmin può eliminare un contratto a conteggio orario.' };
  }

  await softDeleteHourlyContract(id);
  revalidatePath('/dashboard/contracts/hourly');
  return { success: true, message: 'Contratto eliminato.' };
}

export async function createHourlyWorkEntryAction(hourlyContractId: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('hourly_billing', 'create');
    const platformReference = String(formData.get('platformReference') || '') || undefined;
    const description = String(formData.get('description') || '').trim();
    const hours = Number(formData.get('hours'));

    if (!description) return { success: false, message: 'La descrizione è obbligatoria.' };
    if (!Number.isFinite(hours) || hours <= 0) return { success: false, message: 'Le ore devono essere un numero maggiore di zero.' };

    await createHourlyWorkEntry({ hourlyContractId, platformReference, description, hours }, userId);
    revalidatePath(`/dashboard/contracts/hourly/${hourlyContractId}`);
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Lavorazione aggiunta.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiunta della lavorazione." };
  }
}

export async function updateHourlyWorkEntryAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('hourly_billing', 'update');
    const platformReference = String(formData.get('platformReference') || '') || undefined;
    const description = String(formData.get('description') || '').trim();
    const hours = Number(formData.get('hours'));

    if (!description) return { success: false, message: 'La descrizione è obbligatoria.' };
    if (!Number.isFinite(hours) || hours <= 0) return { success: false, message: 'Le ore devono essere un numero maggiore di zero.' };

    await updateHourlyWorkEntry(id, { platformReference, description, hours });
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Lavorazione aggiornata.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento della lavorazione." };
  }
}

export async function deleteHourlyWorkEntryAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'hourly_billing')) {
    return { success: false, message: 'Solo un superadmin può eliminare una lavorazione.' };
  }

  await softDeleteHourlyWorkEntry(id);
  revalidatePath('/dashboard/contracts/hourly');
  return { success: true, message: 'Lavorazione eliminata.' };
}
