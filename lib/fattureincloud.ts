// lib/fattureincloud.ts - Wrapper attorno all'SDK ufficiale Fatture in Cloud (TypeScript)

import {
  Configuration,
  ClientsApi,
  UserApi,
  WebhooksApi,
  Scope,
  OAuth2AuthorizationCodeManager,
  Condition,
  Disjunction,
  Operator,
} from '@fattureincloud/fattureincloud-ts-sdk';
import type { Client as FicClientModel } from '@fattureincloud/fattureincloud-ts-sdk';
import {
  getFicConnection,
  updateFicConnectionTokens,
  setFicWebhookSubscriptionId,
} from '@/lib/db';
import type { Client, FicClientSummary } from '@/lib/types';

const CLIENT_ID = process.env.FIC_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FIC_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.FIC_REDIRECT_URI || '';

export const FIC_SCOPES = [Scope.ENTITY_CLIENTS_READ, Scope.ENTITY_CLIENTS_ALL];

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

const CLIENT_DELETE_EVENT_TYPE = 'it.fattureincloud.webhooks.entities.clients.delete';

/**
 * Stato reale (verificato o no) della subscription webhook per la cancellazione clienti,
 * letto live da FiC (non fidandosi solo dell'id salvato localmente).
 */
export async function getFicClientDeleteWebhookStatus(): Promise<{ id: string; verified: boolean } | null> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new WebhooksApi(new Configuration({ accessToken }));
  const response = await api.listWebhooksSubscriptions(companyId);

  const subscription = (response.data.data ?? []).find((s) => s.types?.includes(CLIENT_DELETE_EVENT_TYPE));
  if (!subscription?.id) return null;
  return { id: subscription.id, verified: Boolean(subscription.verified) };
}

/**
 * Registra (o, se già presente ma non verificata, ri-attiva) la subscription webhook
 * per la cancellazione clienti, così LNON può rilevare quando un cliente sincronizzato
 * viene cancellato su FiC. FiC invia un handshake di verifica (GET con challenge) subito
 * dopo la creazione o dopo il "verify" esplicito: l'endpoint /api/fic/webhooks deve
 * rispondere correttamente perché la subscription diventi attiva.
 */
export async function registerFicClientDeleteWebhook(sinkUrl: string): Promise<string> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new WebhooksApi(new Configuration({ accessToken }));

  const existing = await getFicClientDeleteWebhookStatus();

  let subscriptionId: string | undefined;
  if (!existing) {
    const response = await api.createWebhooksSubscription(companyId, {
      data: {
        sink: sinkUrl,
        types: [CLIENT_DELETE_EVENT_TYPE],
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
