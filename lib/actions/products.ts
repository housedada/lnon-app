'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { createDbProduct, updateDbProduct, softDeleteProduct } from '@/lib/db';
import type { Product } from '@/lib/types';

type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ficSyncStatus'>;

const ProductSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  code: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  measure: z.string().optional().or(z.literal('')),
  netPrice: z.coerce.number().optional().or(z.literal('')),
  grossPrice: z.coerce.number().optional().or(z.literal('')),
  defaultVatRate: z.coerce.number().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

function parseProductFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ProductSchema.parse(raw);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    cleaned[key] = value === '' ? undefined : value;
  }
  return cleaned as unknown as ProductFormData;
}

export async function createProductAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'products', 'create')) {
    throw new Error('Non hai il permesso di creare prodotti.');
  }

  const data = parseProductFormData(formData);
  await createDbProduct({ ...data, createdBy: userId });
  redirect('/dashboard/settings/fic/products');
}

export async function updateProductAction(id: string, formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'products', 'update')) {
    throw new Error('Non hai il permesso di modificare questo prodotto.');
  }

  const data = parseProductFormData(formData);
  await updateDbProduct(id, data);
  redirect('/dashboard/settings/fic/products');
}

export async function deleteProductAction(id: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'products')) {
    throw new Error('Solo un superadmin può eliminare un prodotto.');
  }

  await softDeleteProduct(id);
  redirect('/dashboard/settings/fic/products');
}
