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
  getProjectInvoicesWithNumber,
  linkProjectInvoiceToFic,
  getProjectInvoicesWithFicId,
  updateProjectInvoiceLineItems,
  getProductsWithFicId,
} from '@/lib/db';
import {
  createFicClientFromLnonClient,
  createFicProductFromLnonProduct,
  registerFicDeleteWebhooks,
  searchFicClients,
  searchFicProducts,
  importAllFicProducts,
  listAllFicClients,
  listAllFicInvoices,
  getFicIssuedDocumentItems,
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

// La sincronizzazione con Fatture in Cloud (collegamento/creazione/import) è
// per ora riservata al superadmin, indipendentemente dai permessi CRUD su
// clienti/prodotti (che admin ha comunque per la gestione normale dei record).
async function requireSuperadmin() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (role !== 'superadmin') {
    throw new Error('Solo un superadmin può eseguire la sincronizzazione con Fatture in Cloud.');
  }
  return role;
}

/**
 * Cerca clienti su Fatture in Cloud per nome/P.IVA/codice fiscale, per il collegamento manuale.
 */
export async function searchFicClientsAction(query: string): Promise<FicClientSummary[]> {
  await requireSuperadmin();
  if (!query.trim()) return [];
  return searchFicClients(query.trim());
}

/**
 * Collega un cliente LNON a un cliente Fatture in Cloud esistente (selezionato dall'utente).
 */
export async function linkClientToFicAction(clientId: string, ficId: number) {
  await requireSuperadmin();
  await dbLinkClientToFic(clientId, ficId);
  revalidatePath('/dashboard/clients');
  revalidatePath(`/dashboard/clients/${clientId}/edit`);
}

/**
 * Crea un nuovo cliente su Fatture in Cloud a partire dai dati già presenti su LNON,
 * poi collega il cliente LNON all'id FiC risultante.
 */
export async function createFicClientFromLnonAction(clientId: string) {
  await requireSuperadmin();

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
  await requireSuperadmin();

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

const INVOICE_AMOUNT_TOLERANCE = 0.02;

/**
 * Collega in blocco le fatture progetto storiche (con numero fattura noto,
 * non ancora collegate) alle fatture reali corrispondenti su Fatture in Cloud,
 * confrontando il numero fattura. Se il numero coincide ma l'importo totale
 * differisce oltre la tolleranza di arrotondamento, la riga viene segnalata
 * come "da verificare" invece di essere collegata automaticamente.
 */
export async function bulkMatchInvoicesAction(): Promise<{ matched: number; unmatched: number; uncertain: number }> {
  await requireSuperadmin();

  const [localInvoices, ficInvoices] = await Promise.all([getProjectInvoicesWithNumber(), listAllFicInvoices()]);

  const byNumber = new Map<string, { id: number; amountGross: number | null }>();
  for (const doc of ficInvoices) {
    if (doc.id == null || doc.number == null) continue;
    const key = String(doc.number);
    if (!byNumber.has(key)) byNumber.set(key, { id: doc.id, amountGross: doc.amount_gross ?? null });
  }

  let matched = 0;
  let uncertain = 0;
  for (const invoice of localInvoices) {
    const ficMatch = byNumber.get(invoice.invoiceNumber);
    if (!ficMatch) continue;

    if (ficMatch.amountGross != null && Math.abs(ficMatch.amountGross - invoice.totalAmount) > INVOICE_AMOUNT_TOLERANCE) {
      uncertain += 1;
      console.warn(
        `[bulkMatchInvoicesAction] fattura ${invoice.invoiceNumber}: importo locale ${invoice.totalAmount} != FiC ${ficMatch.amountGross}, non collegata automaticamente`
      );
      continue;
    }

    await linkProjectInvoiceToFic(invoice.id, ficMatch.id);
    matched += 1;
  }

  revalidatePath('/dashboard/invoices');
  return { matched, unmatched: localInvoices.length - matched - uncertain, uncertain };
}

/**
 * Propone abbinamenti per nome per i clienti LNON rimasti "non sincronizzati"
 * dopo il match esatto su P.IVA/codice fiscale, limitatamente a quelli senza
 * P.IVA né codice fiscale (per cui il match esatto non è mai stato possibile).
 * Non collega nulla: l'utente deve confermare in un secondo passaggio.
 * Propone solo corrispondenze di nome univoche (un solo cliente FiC con quel nome).
 */
export async function suggestNameMatchesAction(): Promise<NameMatchSuggestion[]> {
  await requireSuperadmin();

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
  await requireSuperadmin();

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
  await requireSuperadmin();
  if (!query.trim()) return [];
  return searchFicProducts(query.trim());
}

/**
 * Collega un prodotto LNON a un prodotto Fatture in Cloud esistente (selezionato dall'utente).
 */
export async function linkProductToFicAction(productId: string, ficId: number) {
  await requireSuperadmin();
  await dbLinkProductToFic(productId, ficId);
  revalidatePath('/dashboard/settings/products');
}

/**
 * Crea un nuovo prodotto su Fatture in Cloud a partire dai dati già presenti su LNON,
 * poi collega il prodotto LNON all'id FiC risultante.
 */
export async function createFicProductFromLnonAction(productId: string) {
  await requireSuperadmin();

  const product = await getProductById(productId);
  if (!product) {
    throw new Error('Prodotto non trovato.');
  }

  const ficId = await createFicProductFromLnonProduct(product);
  await dbLinkProductToFic(productId, ficId);

  revalidatePath('/dashboard/settings/products');
  redirect('/dashboard/settings/products');
}

/**
 * Importa/aggiorna in LNON tutti i prodotti presenti su Fatture in Cloud.
 */
export async function importAllFicProductsAction(): Promise<number> {
  await requireSuperadmin();
  const count = await importAllFicProducts();
  revalidatePath('/dashboard/settings/products');
  return count;
}

/**
 * Scarica da Fatture in Cloud le sottovoci reali (con prodotto) di tutte le
 * fatture progetto già collegate a un documento FiC, sostituendo le lineItems
 * locali. Tollerante agli errori: una fattura che fallisce non blocca le
 * altre. Riproponibile: ogni click sovrascrive con l'ultimo stato FiC.
 */
export async function syncInvoiceLineItemsFromFicAction(): Promise<{ synced: number; errors: number }> {
  await requireSuperadmin();

  const [invoices, products] = await Promise.all([getProjectInvoicesWithFicId(), getProductsWithFicId()]);
  const productIdByFicId = new Map(products.map((p) => [p.ficId, p.id]));

  let synced = 0;
  let errors = 0;

  for (const invoice of invoices) {
    try {
      const items = await getFicIssuedDocumentItems(invoice.ficInvoiceId);
      const lineItems = items.map((item) => ({
        label: item.description,
        netAmount: item.netAmount,
        productId: item.ficProductId != null ? productIdByFicId.get(item.ficProductId) : undefined,
      }));
      await updateProjectInvoiceLineItems(invoice.id, lineItems);
      synced += 1;
    } catch (err) {
      errors += 1;
      console.warn(`[syncInvoiceLineItemsFromFicAction] fattura ${invoice.id}: errore nel recupero sottovoci da FIC`, err);
    }
  }

  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/invoices');
  return { synced, errors };
}
