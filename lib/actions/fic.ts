'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getClientById, linkClientToFic as dbLinkClientToFic } from '@/lib/db';
import {
  createFicClientFromLnonClient,
  registerFicClientDeleteWebhook,
  searchFicClients,
} from '@/lib/fattureincloud';
import type { FicClientSummary } from '@/lib/types';

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
 * Registra (o rinnova) la subscription webhook per la cancellazione clienti su FiC,
 * puntando all'endpoint pubblico dell'app corrente.
 */
export async function registerFicWebhookAction(appBaseUrl: string) {
  await requireRole('settings', 'manage_integrations');

  const secret = process.env.FIC_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('FIC_WEBHOOK_SECRET non configurato.');
  }

  const sinkUrl = `${appBaseUrl.replace(/\/$/, '')}/api/fic/webhooks?secret=${encodeURIComponent(secret)}`;
  await registerFicClientDeleteWebhook(sinkUrl);

  revalidatePath('/dashboard/settings/fic');
}
