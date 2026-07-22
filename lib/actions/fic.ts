'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  getClientById,
  getProductById,
  linkClientToFic as dbLinkClientToFic,
  linkProductToFic as dbLinkProductToFic,
  getAllClientsWithTaxIds,
} from '@/lib/db';
import {
  createFicClientFromLnonClient,
  createFicProductFromLnonProduct,
  registerFicDeleteWebhooks,
  searchFicClients,
  searchFicProducts,
  importAllFicProducts,
  listAllFicClients,
} from '@/lib/fattureincloud';
import type { FicClientSummary, FicProductSummary } from '@/lib/types';

function normalizeTaxId(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed || null;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface NameMatchSuggestion {
  clientId: string;
  clientName: string;
  ficId: number;
  ficName: string;
}

async function requireRole(resource: string, action: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return role;
}

/**
 * Cerca clienti su Fatture in Cloud per nome/P.IVA/codice fiscale, per il collegamento manuale.
 */
export async function searchFicClientsAction(query: string): Promise<FicClientSummary[]> {
  await requireRole('clients', 'update');
  if (!query.trim()) return [];
  return searchFicClients(query.trim());
}

/**
 * Collega un cliente LNON a un cliente Fatture in Cloud esistente (selezionato dall'utente).
 */
export async function linkClientToFicAction(clientId: string, ficId: number) {
  await requireRole('clients', 'update');
  await dbLinkClientToFic(clientId, ficId);
  revalidatePath('/dashboard/clients');
  revalidatePath(`/dashboard/clients/${clientId}/edit`);
}

/**
 * Crea un nuovo cliente su Fatture in Cloud a partire dai dati già presenti su LNON,
 * poi collega il cliente LNON all'id FiC risultante.
 */
export async function createFicClientFromLnonAction(clientId: string) {
  await requireRole('clients', 'update');

  const client = await getClientById(clientId);
  if (!client) {
    throw new Error('Cliente non trovato.');
  }

  const ficId = await createFicClientFromLnonClient(client);
  await dbLinkClientToFic(clientId, ficId);

  revalidatePath('/dashboard/clients');
  redirect('/dashboard/clients');
}

/**
 * Registra (o rinnova) la subscription webhook per la cancellazione di clienti e prodotti
 * su FiC, puntando all'endpoint pubblico dell'app corrente.
 */
export async function registerFicWebhookAction(appBaseUrl: string) {
  await requireRole('settings', 'manage_integrations');

  const secret = process.env.FIC_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('FIC_WEBHOOK_SECRET non configurato.');
  }

  const sinkUrl = `${appBaseUrl.replace(/\/$/, '')}/api/fic/webhooks?secret=${encodeURIComponent(secret)}`;
  await registerFicDeleteWebhooks(sinkUrl);

  revalidatePath('/dashboard/settings/fic');
}

/**
 * Collega in blocco i clienti LNON "non sincronizzati" ai clienti FiC esistenti,
 * solo quando c'è una corrispondenza esatta su P.IVA o codice fiscale. Non crea
 * nulla su FiC: i clienti senza corrispondenza restano da collegare manualmente.
 */
export async function bulkMatchClientsAction(): Promise<{ matched: number; unmatched: number }> {
  await requireRole('clients', 'update');

  const [lnonClients, ficClients] = await Promise.all([getAllClientsWithTaxIds(), listAllFicClients()]);

  const byVat = new Map<string, number>();
  const byTaxCode = new Map<string, number>();
  for (const fc of ficClients) {
    if (fc.id == null) continue;
    const vat = normalizeTaxId(fc.vat_number ?? undefined);
    const taxCode = normalizeTaxId(fc.tax_code ?? undefined);
    if (vat && !byVat.has(vat)) byVat.set(vat, fc.id);
    if (taxCode && !byTaxCode.has(taxCode)) byTaxCode.set(taxCode, fc.id);
  }

  let matched = 0;
  for (const client of lnonClients) {
    const vat = normalizeTaxId(client.taxId);
    const taxCode = normalizeTaxId(client.fiscalCode);
    const ficId = (vat && byVat.get(vat)) ?? (taxCode && byTaxCode.get(taxCode)) ?? undefined;
    if (ficId) {
      await dbLinkClientToFic(client.id, ficId);
      matched += 1;
    }
  }

  revalidatePath('/dashboard/clients');
  return { matched, unmatched: lnonClients.length - matched };
}

/**
 * Propone abbinamenti per nome per i clienti LNON rimasti "non sincronizzati"
 * dopo il match esatto su P.IVA/codice fiscale, limitatamente a quelli senza
 * P.IVA né codice fiscale (per cui il match esatto non è mai stato possibile).
 * Non collega nulla: l'utente deve confermare in un secondo passaggio.
 * Propone solo corrispondenze di nome univoche (un solo cliente FiC con quel nome).
 */
export async function suggestNameMatchesAction(): Promise<NameMatchSuggestion[]> {
  await requireRole('clients', 'update');

  const [lnonClients, ficClients] = await Promise.all([getAllClientsWithTaxIds(), listAllFicClients()]);

  const byName = new Map<string, { id: number; name: string }[]>();
  for (const fc of ficClients) {
    if (fc.id == null || !fc.name) continue;
    const key = normalizeName(fc.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push({ id: fc.id, name: fc.name });
    byName.set(key, list);
  }

  const suggestions: NameMatchSuggestion[] = [];
  for (const client of lnonClients) {
    if (client.taxId || client.fiscalCode) continue; // già coperti dal match esatto
    const key = normalizeName(client.name);
    const candidates = byName.get(key);
    if (candidates && candidates.length === 1) {
      suggestions.push({
        clientId: client.id,
        clientName: client.name,
        ficId: candidates[0].id,
        ficName: candidates[0].name,
      });
    }
  }

  return suggestions;
}

/**
 * Collega in blocco le coppie cliente LNON / cliente FiC confermate dall'utente
 * dopo la revisione degli abbinamenti per nome.
 */
export async function confirmNameMatchesAction(pairs: { clientId: string; ficId: number }[]): Promise<number> {
  await requireRole('clients', 'update');

  for (const pair of pairs) {
    await dbLinkClientToFic(pair.clientId, pair.ficId);
  }

  revalidatePath('/dashboard/clients');
  return pairs.length;
}

/**
 * Cerca prodotti su Fatture in Cloud per nome/codice, per il collegamento manuale.
 */
export async function searchFicProductsAction(query: string): Promise<FicProductSummary[]> {
  await requireRole('products', 'update');
  if (!query.trim()) return [];
  return searchFicProducts(query.trim());
}

/**
 * Collega un prodotto LNON a un prodotto Fatture in Cloud esistente (selezionato dall'utente).
 */
export async function linkProductToFicAction(productId: string, ficId: number) {
  await requireRole('products', 'update');
  await dbLinkProductToFic(productId, ficId);
  revalidatePath('/dashboard/settings/fic/products');
}

/**
 * Crea un nuovo prodotto su Fatture in Cloud a partire dai dati già presenti su LNON,
 * poi collega il prodotto LNON all'id FiC risultante.
 */
export async function createFicProductFromLnonAction(productId: string) {
  await requireRole('products', 'update');

  const product = await getProductById(productId);
  if (!product) {
    throw new Error('Prodotto non trovato.');
  }

  const ficId = await createFicProductFromLnonProduct(product);
  await dbLinkProductToFic(productId, ficId);

  revalidatePath('/dashboard/settings/fic/products');
  redirect('/dashboard/settings/fic/products');
}

/**
 * Importa/aggiorna in LNON tutti i prodotti presenti su Fatture in Cloud.
 */
export async function importAllFicProductsAction(): Promise<number> {
  await requireRole('products', 'update');
  const count = await importAllFicProducts();
  revalidatePath('/dashboard/settings/fic/products');
  return count;
}
