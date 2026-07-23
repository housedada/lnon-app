'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { createDbClient, updateDbClient, softDeleteClient } from '@/lib/db';
import type { Client } from '@/lib/types';

type ClientFormData = Omit<Client, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

const ClientSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  contactPerson: z.string().optional().or(z.literal('')),
  fax: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  addressNotes: z.string().optional().or(z.literal('')),
  shippingAddress: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  fiscalCode: z.string().optional().or(z.literal('')),
  pecEmail: z.string().email('PEC non valida').optional().or(z.literal('')),
  iban: z.string().optional().or(z.literal('')),
  sdiCode: z.string().optional().or(z.literal('')),
  defaultVatRate: z.coerce.number().optional().or(z.literal('')),
  paymentTerms: z.string().optional().or(z.literal('')),
  defaultPaymentMethod: z.string().optional().or(z.literal('')),
  defaultDiscount: z.coerce.number().optional().or(z.literal('')),
  letterOfIntentEnabled: z.coerce.boolean().optional(),
  internalCode: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

function parseClientFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ClientSchema.parse({
    ...raw,
    letterOfIntentEnabled: raw.letterOfIntentEnabled === 'on',
  });

  // Zod above allows '' for optional strings/numbers to keep empty form
  // fields valid; normalize '' back to undefined before hitting the DB layer.
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    cleaned[key] = value === '' ? undefined : value;
  }
  return cleaned as unknown as ClientFormData;
}

export async function createClientAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'clients', 'create')) {
    throw new Error('Non hai il permesso di creare clienti.');
  }

  const data = parseClientFormData(formData);
  await createDbClient({ ...data, createdBy: userId });
  redirect('/dashboard/clients?saved=1');
}

export async function updateClientAction(id: string, formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'clients', 'update')) {
    throw new Error('Non hai il permesso di modificare questo cliente.');
  }

  const data = parseClientFormData(formData);
  await updateDbClient(id, data);
  redirect('/dashboard/clients?saved=1');
}

export async function deleteClientAction(id: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'clients')) {
    throw new Error('Solo un superadmin può eliminare un cliente.');
  }

  await softDeleteClient(id);
  redirect('/dashboard/clients');
}

export async function deleteClientFromListAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'clients')) {
    return { success: false, message: 'Solo un superadmin può eliminare un cliente.' };
  }

  await softDeleteClient(id);
  revalidatePath('/dashboard/clients');
  return { success: true, message: 'Cliente eliminato.' };
}
