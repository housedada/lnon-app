// lib/fattureincloud.ts - Wrapper attorno all'SDK ufficiale Fatture in Cloud (TypeScript)

import {
  Configuration,
  ClientsApi,
  ProductsApi,
  UserApi,
  WebhooksApi,
  Scope,
  OAuth2AuthorizationCodeManager,
  Condition,
  Disjunction,
  Operator,
  EventType,
} from '@fattureincloud/fattureincloud-ts-sdk';
import type { Client as FicClientModel, Product as FicProductModel } from '@fattureincloud/fattureincloud-ts-sdk';
import {
  getFicConnection,
  updateFicConnectionTokens,
  setFicWebhookSubscriptionId,
  upsertProductFromFic,
} from '@/lib/db';
import type { Client, FicClientSummary, Product, FicProductSummary } from '@/lib/types';

const CLIENT_ID = process.env.FIC_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FIC_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.FIC_REDIRECT_URI || '';

export const FIC_SCOPES = [
  Scope.ENTITY_CLIENTS_READ,
  Scope.ENTITY_CLIENTS_ALL,
  Scope.PRODUCTS_READ,
  Scope.PRODUCTS_ALL,
];

function getOAuthManager() {
  return new OAuth2AuthorizationCodeManager(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getFicAuthorizationUrl(state: string): string {
  return getOAuthManager().getAuthorizationUrl(FIC_SCOPES, state);
}

export async function exchangeCodeForTokens(code: string) {
  return getOAuthManager().fetchToken(code);
}

/**
 * Ritorna un access token valido per la connessione FiC salvata, rinnovandolo
 * automaticamente se scaduto o in scadenza entro 60s. Lancia se non c'è connessione.
 */
export async function getValidAccessToken(): Promise<{ accessToken: string; companyId: number }> {
  const connection = await getFicConnection();
  if (!connection) {
    throw new Error('Nessuna connessione a Fatture in Cloud configurata.');
  }

  const expiresInMs = connection.expiresAt.getTime() - Date.now();
  if (expiresInMs > 60_000) {
    return { accessToken: connection.accessToken, companyId: connection.ficCompanyId };
  }

  const refreshed = await getOAuthManager().refreshToken(connection.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  await updateFicConnectionTokens(connection.id, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt,
  });

  return { accessToken: refreshed.accessToken, companyId: connection.ficCompanyId };
}

async function getClientsApi(): Promise<{ api: ClientsApi; companyId: number }> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new ClientsApi(new Configuration({ accessToken }));
  return { api, companyId };
}

function ficClientToSummary(c: FicClientModel): FicClientSummary {
  return {
    id: c.id ?? 0,
    name: c.name ?? '(senza nome)',
    vatNumber: c.vat_number ?? undefined,
    taxCode: c.tax_code ?? undefined,
    email: c.email ?? undefined,
  };
}

/**
 * Cerca clienti su Fatture in Cloud (per nome/P.IVA/codice fiscale), per il collegamento manuale.
 */
export async function searchFicClients(query: string): Promise<FicClientSummary[]> {
  const { api, companyId } = await getClientsApi();

  // FiC non fa full-text search: 'q' è un'espressione di filtro strutturata
  // (vedi src/filter dell'SDK), non una stringa libera.
  const byName = new Condition('name', Operator.CONTAINS, query);
  const byVat = new Condition('vat_number', Operator.CONTAINS, query);
  const byTaxCode = new Condition('tax_code', Operator.CONTAINS, query);
  const filter = new Disjunction(new Disjunction(byName, byVat), byTaxCode).buildQuery();

  const response = await api.listClients(companyId, undefined, undefined, undefined, 1, 20, filter);
  return (response.data.data ?? []).map(ficClientToSummary);
}

/**
 * Crea un nuovo cliente su Fatture in Cloud a partire dai dati del cliente LNON.
 * Ritorna l'id FiC del cliente creato.
 */
export async function createFicClientFromLnonClient(client: Client): Promise<number> {
  const { api, companyId } = await getClientsApi();

  const response = await api.createClient(companyId, {
    data: {
      name: client.name,
      contact_person: client.contactPerson,
      vat_number: client.taxId,
      tax_code: client.fiscalCode,
      address_street: client.address,
      address_postal_code: client.postalCode,
      address_city: client.city,
      address_province: client.province,
      country: client.country,
      email: client.email,
      certified_email: client.pecEmail,
      phone: client.phone,
      fax: client.fax,
      notes: client.notes,
      bank_iban: client.iban,
      shipping_address: client.shippingAddress,
      default_discount: client.defaultDiscount,
      ei_code: client.sdiCode,
      has_intent_declaration: client.letterOfIntentEnabled,
      type: 'company',
    },
  });

  const ficId = response.data.data?.id;
  if (!ficId) {
    throw new Error('Fatture in Cloud non ha restituito un id per il cliente creato.');
  }
  return ficId;
}

export async function getFicCompanies(accessToken: string) {
  const api = new UserApi(new Configuration({ accessToken }));
  const response = await api.listUserCompanies();
  return response.data.data?.companies ?? [];
}

async function getProductsApi(): Promise<{ api: ProductsApi; companyId: number }> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new ProductsApi(new Configuration({ accessToken }));
  return { api, companyId };
}

function ficProductToSummary(p: FicProductModel): FicProductSummary {
  return { id: p.id ?? 0, name: p.name ?? '(senza nome)', code: p.code ?? undefined };
}

function ficProductToLocalFields(p: FicProductModel): Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ficId' | 'ficSyncStatus' | 'ficLastSyncedAt'> {
  return {
    name: p.name ?? '(senza nome)',
    code: p.code ?? undefined,
    description: p.description ?? undefined,
    category: p.category ?? undefined,
    measure: p.measure ?? undefined,
    netPrice: p.net_price ?? undefined,
    grossPrice: p.gross_price ?? undefined,
    defaultVatRate: p.default_vat?.value ?? undefined,
    notes: p.notes ?? undefined,
  };
}

/**
 * Cerca prodotti su Fatture in Cloud (per nome/codice), per il collegamento manuale.
 */
export async function searchFicProducts(query: string): Promise<FicProductSummary[]> {
  const { api, companyId } = await getProductsApi();
  const byName = new Condition('name', Operator.CONTAINS, query);
  const byCode = new Condition('code', Operator.CONTAINS, query);
  const filter = new Disjunction(byName, byCode).buildQuery();

  const response = await api.listProducts(companyId, undefined, undefined, undefined, 1, 20, filter);
  return (response.data.data ?? []).map(ficProductToSummary);
}

/**
 * Crea un nuovo prodotto su Fatture in Cloud a partire dai dati del prodotto LNON.
 * Ritorna l'id FiC del prodotto creato.
 */
export async function createFicProductFromLnonProduct(product: Product): Promise<number> {
  const { api, companyId } = await getProductsApi();

  const response = await api.createProduct(companyId, {
    data: {
      name: product.name,
      code: product.code,
      description: product.description,
      category: product.category,
      measure: product.measure,
      net_price: product.netPrice,
      gross_price: product.grossPrice,
      notes: product.notes,
    },
  });

  const ficId = response.data.data?.id;
  if (!ficId) {
    throw new Error('Fatture in Cloud non ha restituito un id per il prodotto creato.');
  }
  return ficId;
}

/**
 * Importa/aggiorna in LNON tutti i prodotti presenti su Fatture in Cloud (mirror one-way FiC -> LNON).
 * Ritorna il numero di prodotti importati/aggiornati.
 */
export async function importAllFicProducts(): Promise<number> {
  const { api, companyId } = await getProductsApi();
  let page = 1;
  let count = 0;

  while (true) {
    const response = await api.listProducts(companyId, undefined, undefined, undefined, page, 100);
    const items = response.data.data ?? [];
    for (const item of items) {
      if (item.id == null) continue;
      await upsertProductFromFic(item.id, ficProductToLocalFields(item));
      count += 1;
    }
    const lastPage = response.data.last_page ?? page;
    if (page >= lastPage || items.length === 0) break;
    page += 1;
  }

  return count;
}

/**
 * Scarica tutti i clienti presenti su Fatture in Cloud (per il match automatico bulk).
 */
export async function listAllFicClients(): Promise<FicClientModel[]> {
  const { api, companyId } = await getClientsApi();
  let page = 1;
  const all: FicClientModel[] = [];

  while (true) {
    const response = await api.listClients(companyId, undefined, undefined, undefined, page, 100);
    const items = response.data.data ?? [];
    all.push(...items);
    const lastPage = response.data.last_page ?? page;
    if (page >= lastPage || items.length === 0) break;
    page += 1;
  }

  return all;
}

const CLIENT_DELETE_EVENT_TYPE = EventType.ItFattureincloudWebhooksEntitiesClientsDelete;
const PRODUCT_DELETE_EVENT_TYPE = EventType.ItFattureincloudWebhooksProductsDelete;
export const FIC_WEBHOOK_DELETE_TYPES = [CLIENT_DELETE_EVENT_TYPE, PRODUCT_DELETE_EVENT_TYPE];

/**
 * Stato reale (verificato o no) della subscription webhook per le cancellazioni
 * (clienti + prodotti), letto live da FiC (non fidandosi solo dell'id salvato localmente).
 */
export async function getFicDeleteWebhookStatus(): Promise<{ id: string; verified: boolean; types: string[] } | null> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new WebhooksApi(new Configuration({ accessToken }));
  const response = await api.listWebhooksSubscriptions(companyId);

  const subscription = (response.data.data ?? []).find((s) =>
    FIC_WEBHOOK_DELETE_TYPES.some((t) => s.types?.includes(t))
  );
  if (!subscription?.id) return null;
  return { id: subscription.id, verified: Boolean(subscription.verified), types: subscription.types ?? [] };
}

/**
 * Registra (o, se già presente ma non verificata, ri-attiva) la subscription webhook
 * per la cancellazione clienti e prodotti, così LNON può rilevare quando una risorsa
 * sincronizzata viene cancellata su FiC. FiC invia un handshake di verifica (GET con
 * challenge) subito dopo la creazione o dopo il "verify" esplicito: l'endpoint
 * /api/fic/webhooks deve rispondere correttamente perché la subscription diventi attiva.
 */
export async function registerFicDeleteWebhooks(sinkUrl: string): Promise<string> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new WebhooksApi(new Configuration({ accessToken }));

  const existing = await getFicDeleteWebhookStatus();

  let subscriptionId: string | undefined;
  if (!existing) {
    const response = await api.createWebhooksSubscription(companyId, {
      data: {
        sink: sinkUrl,
        types: FIC_WEBHOOK_DELETE_TYPES,
      },
    });
    subscriptionId = response.data.data?.id ?? undefined;
  } else {
    subscriptionId = existing.id;
    if (!existing.verified) {
      await api.verifyWebhooksSubscription(companyId, existing.id);
    }
  }

  const connection = await getFicConnection();
  if (connection && subscriptionId) {
    await setFicWebhookSubscriptionId(connection.id, subscriptionId);
  }
  return subscriptionId ?? '';
}
