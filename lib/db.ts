// lib/db.ts - Connessione Supabase

import { createClient } from '@supabase/supabase-js';
import type {
  User,
  Client,
  Job,
  Task,
  Invoice,
  Invitation,
  ActivityLog,
  FicConnection,
  Product,
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client pubblico per il frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Client server-side con Service Role Key (per operazioni protette)
 * Usa solo nel backend - NEVER esporre in frontend
 */
export const supabaseServer = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ===== HELPER FUNCTIONS =====

/**
 * Ottieni utente corrente
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Ottieni profilo utente da DB
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

function clientRowToClient(row: Record<string, any>): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    companyName: row.company_name ?? undefined,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    postalCode: row.postal_code ?? undefined,
    country: row.country ?? undefined,
    taxId: row.tax_id ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    internalCode: row.internal_code ?? undefined,
    province: row.province ?? undefined,
    addressNotes: row.address_notes ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    fiscalCode: row.fiscal_code ?? undefined,
    pecEmail: row.pec_email ?? undefined,
    iban: row.iban ?? undefined,
    sdiCode: row.sdi_code ?? undefined,
    defaultVatRate: row.default_vat_rate ?? undefined,
    paymentTerms: row.payment_terms ?? undefined,
    defaultPaymentMethod: row.default_payment_method ?? undefined,
    fax: row.fax ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    defaultDiscount: row.default_discount ?? undefined,
    letterOfIntentEnabled: row.letter_of_intent_enabled ?? undefined,
    receiptProtocol: row.receipt_protocol ?? undefined,
    telematicReceiptDate: row.telematic_receipt_date ? new Date(row.telematic_receipt_date) : undefined,
    ficId: row.fic_id ?? undefined,
    ficSyncStatus: row.fic_sync_status ?? 'not_synced',
    ficLastSyncedAt: row.fic_last_synced_at ? new Date(row.fic_last_synced_at) : undefined,
  };
}

function clientToRow(data: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.companyName !== undefined) row.company_name = data.companyName;
  if (data.address !== undefined) row.address = data.address;
  if (data.city !== undefined) row.city = data.city;
  if (data.postalCode !== undefined) row.postal_code = data.postalCode;
  if (data.country !== undefined) row.country = data.country;
  if (data.taxId !== undefined) row.tax_id = data.taxId;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  if (data.internalCode !== undefined) row.internal_code = data.internalCode;
  if (data.province !== undefined) row.province = data.province;
  if (data.addressNotes !== undefined) row.address_notes = data.addressNotes;
  if (data.contactPerson !== undefined) row.contact_person = data.contactPerson;
  if (data.fiscalCode !== undefined) row.fiscal_code = data.fiscalCode;
  if (data.pecEmail !== undefined) row.pec_email = data.pecEmail;
  if (data.iban !== undefined) row.iban = data.iban;
  if (data.sdiCode !== undefined) row.sdi_code = data.sdiCode;
  if (data.defaultVatRate !== undefined) row.default_vat_rate = data.defaultVatRate;
  if (data.paymentTerms !== undefined) row.payment_terms = data.paymentTerms;
  if (data.defaultPaymentMethod !== undefined) row.default_payment_method = data.defaultPaymentMethod;
  if (data.fax !== undefined) row.fax = data.fax;
  if (data.shippingAddress !== undefined) row.shipping_address = data.shippingAddress;
  if (data.defaultDiscount !== undefined) row.default_discount = data.defaultDiscount;
  if (data.letterOfIntentEnabled !== undefined) row.letter_of_intent_enabled = data.letterOfIntentEnabled;
  if (data.receiptProtocol !== undefined) row.receipt_protocol = data.receiptProtocol;
  if (data.telematicReceiptDate !== undefined) {
    row.telematic_receipt_date = data.telematicReceiptDate.toISOString().slice(0, 10);
  }
  return row;
}

/**
 * Crea un nuovo cliente
 */
export async function createDbClient(
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Client> {
  const { data, error } = await supabaseServer
    .from('clients')
    .insert([clientToRow(clientData)])
    .select()
    .single();

  if (error) throw error;
  return clientRowToClient(data);
}

/**
 * Ottieni tutti i clienti (con filtri opzionali)
 */
export async function getClients(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Client[]; total: number }> {
  let query = supabaseServer
    .from('clients')
    .select('*', { count: 'exact' })
    .is('deleted_at', null) // Non includiamo soft-deleted
    .order('name', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
    );
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: (data ?? []).map(clientRowToClient), total: count ?? 0 };
}

/**
 * Ottieni un cliente per id
 */
export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabaseServer
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return clientRowToClient(data);
}

/**
 * Aggiorna un cliente esistente
 */
export async function updateDbClient(
  id: string,
  clientData: Partial<Omit<Client, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>
): Promise<Client> {
  const { data, error } = await supabaseServer
    .from('clients')
    .update(clientToRow(clientData))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return clientRowToClient(data);
}

/**
 * Crea un nuovo lavoro
 */
export async function createJob(
  jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>
) {
  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ottieni lavori (con filtri)
 */
export async function getJobs(filters?: {
  clientId?: string;
  status?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('jobs')
    .select('*, clients!inner(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, total: count };
}

/**
 * Approva un lavoro
 */
export async function approveJob(jobId: string, userId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: userId,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crea un nuovo task
 */
export async function createTask(
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ottieni task di un lavoro
 */
export async function getJobTasks(jobId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Aggiorna status di un task
 */
export async function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  completedAt?: Date
) {
  const updates: any = { status };

  if (status === 'done' && !completedAt) {
    updates.completed_at = new Date().toISOString();
  } else if (completedAt) {
    updates.completed_at = completedAt.toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crea una nuova fattura
 */
export async function createInvoice(
  invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
) {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoiceData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ottieni fatture
 */
export async function getInvoices(filters?: {
  jobId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('invoices')
    .select('*, jobs!inner(title, clients!inner(name))', { count: 'exact' })
    .order('issue_date', { ascending: false });

  if (filters?.jobId) {
    query = query.eq('job_id', filters.jobId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, total: count };
}

/**
 * Crea un invito per un nuovo utente
 */
export async function createInvitation(
  email: string,
  role: 'admin' | 'dipendente',
  invitedBy: string,
  expiresInDays: number = 7
) {
  // Genera token casuale
  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

  // Calcola data di scadenza
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from('invitations')
    .insert([
      {
        email,
        role,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ottieni Activity Logs (solo per superadmin)
 */
export async function getActivityLogs(filters?: {
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data, total: count };
}

/**
 * Soft delete di un cliente (non cancellare fisicamente)
 */
export async function softDeleteClient(clientId: string): Promise<Client> {
  const { data, error } = await supabaseServer
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return clientRowToClient(data);
}

function ficConnectionRowToFicConnection(row: Record<string, any>): FicConnection {
  return {
    id: row.id,
    ficCompanyId: row.fic_company_id,
    ficCompanyName: row.fic_company_name ?? undefined,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: new Date(row.expires_at),
    webhookSubscriptionId: row.webhook_subscription_id ?? undefined,
    connectedBy: row.connected_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Ottieni la connessione a Fatture in Cloud (unica per l'azienda), se esiste
 */
export async function getFicConnection(): Promise<FicConnection | null> {
  const { data, error } = await supabaseServer
    .from('fic_connection')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? ficConnectionRowToFicConnection(data) : null;
}

/**
 * Salva una nuova connessione a Fatture in Cloud, sostituendo l'eventuale precedente
 */
export async function saveFicConnection(connection: {
  ficCompanyId: number;
  ficCompanyName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  connectedBy: string;
}): Promise<FicConnection> {
  await supabaseServer.from('fic_connection').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data, error } = await supabaseServer
    .from('fic_connection')
    .insert([
      {
        fic_company_id: connection.ficCompanyId,
        fic_company_name: connection.ficCompanyName,
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        expires_at: connection.expiresAt.toISOString(),
        connected_by: connection.connectedBy,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return ficConnectionRowToFicConnection(data);
}

/**
 * Aggiorna i token della connessione FiC esistente (dopo un refresh)
 */
export async function updateFicConnectionTokens(
  id: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: Date }
): Promise<FicConnection> {
  const { data, error } = await supabaseServer
    .from('fic_connection')
    .update({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return ficConnectionRowToFicConnection(data);
}

/**
 * Salva l'id della subscription webhook registrata su FiC
 */
export async function setFicWebhookSubscriptionId(id: string, subscriptionId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('fic_connection')
    .update({ webhook_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Collega un cliente LNON a un cliente Fatture in Cloud esistente (o appena creato)
 */
export async function linkClientToFic(clientId: string, ficId: number): Promise<Client> {
  const { data, error } = await supabaseServer
    .from('clients')
    .update({
      fic_id: ficId,
      fic_sync_status: 'synced',
      fic_last_synced_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return clientRowToClient(data);
}

/**
 * Segna come "orfani" tutti i clienti collegati a un fic_id cancellato su FiC.
 * Il record LNON e i job collegati non vengono toccati: cambia solo lo stato di sync.
 */
export async function markClientsOrphanedByFicId(ficId: number): Promise<void> {
  const { error } = await supabaseServer
    .from('clients')
    .update({ fic_sync_status: 'orphaned' })
    .eq('fic_id', ficId)
    .eq('fic_sync_status', 'synced');

  if (error) throw error;
}

/**
 * Log di attività manuale
 */
export async function logActivity(
  userId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  changes?: Record<string, any>
) {
  const { error } = await supabase.from('activity_logs').insert([
    {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
      ip_address: null, // Opzionale: potrebbe essere preso da headers
    },
  ]);

  if (error) {
    console.error('Error logging activity:', error);
  }
}

function productRowToProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    measure: row.measure ?? undefined,
    netPrice: row.net_price ?? undefined,
    grossPrice: row.gross_price ?? undefined,
    defaultVatRate: row.default_vat_rate ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    ficId: row.fic_id ?? undefined,
    ficSyncStatus: row.fic_sync_status ?? 'not_synced',
    ficLastSyncedAt: row.fic_last_synced_at ? new Date(row.fic_last_synced_at) : undefined,
  };
}

function productToRow(data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.code !== undefined) row.code = data.code;
  if (data.description !== undefined) row.description = data.description;
  if (data.category !== undefined) row.category = data.category;
  if (data.measure !== undefined) row.measure = data.measure;
  if (data.netPrice !== undefined) row.net_price = data.netPrice;
  if (data.grossPrice !== undefined) row.gross_price = data.grossPrice;
  if (data.defaultVatRate !== undefined) row.default_vat_rate = data.defaultVatRate;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}

/**
 * Crea un nuovo prodotto locale
 */
export async function createDbProduct(
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ficSyncStatus'>
): Promise<Product> {
  const { data, error } = await supabaseServer
    .from('products')
    .insert([productToRow(productData)])
    .select()
    .single();

  if (error) throw error;
  return productRowToProduct(data);
}

/**
 * Ottieni tutti i prodotti (con filtri opzionali)
 */
export async function getProducts(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Product[]; total: number }> {
  let query = supabaseServer
    .from('products')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: (data ?? []).map(productRowToProduct), total: count ?? 0 };
}

/**
 * Ottieni un prodotto per id
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabaseServer
    .from('products')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return productRowToProduct(data);
}

/**
 * Aggiorna un prodotto esistente
 */
export async function updateDbProduct(
  id: string,
  productData: Partial<Omit<Product, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>
): Promise<Product> {
  const { data, error } = await supabaseServer
    .from('products')
    .update(productToRow(productData))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return productRowToProduct(data);
}

/**
 * Soft delete di un prodotto
 */
export async function softDeleteProduct(productId: string): Promise<Product> {
  const { data, error } = await supabaseServer
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return productRowToProduct(data);
}

/**
 * Collega un prodotto LNON a un prodotto Fatture in Cloud esistente (o appena creato)
 */
export async function linkProductToFic(productId: string, ficId: number): Promise<Product> {
  const { data, error } = await supabaseServer
    .from('products')
    .update({
      fic_id: ficId,
      fic_sync_status: 'synced',
      fic_last_synced_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return productRowToProduct(data);
}

/**
 * Segna come "orfani" i prodotti collegati a un fic_id cancellato su FiC.
 */
export async function markProductsOrphanedByFicId(ficId: number): Promise<void> {
  const { error } = await supabaseServer
    .from('products')
    .update({ fic_sync_status: 'orphaned' })
    .eq('fic_id', ficId)
    .eq('fic_sync_status', 'synced');

  if (error) throw error;
}

/**
 * Crea o aggiorna (per fic_id) un prodotto locale a partire da un prodotto FiC,
 * usato dall'import/mirror di massa del catalogo.
 */
export async function upsertProductFromFic(ficId: number, data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ficId' | 'ficSyncStatus' | 'ficLastSyncedAt'>): Promise<void> {
  const row = {
    ...productToRow(data),
    fic_id: ficId,
    fic_sync_status: 'synced',
    fic_last_synced_at: new Date().toISOString(),
  };

  const { error } = await supabaseServer.from('products').upsert([row], { onConflict: 'fic_id' });
  if (error) throw error;
}

/**
 * Ottieni tutti i client id LNON con fic_id valorizzato (per il match automatico bulk)
 */
export async function getAllClientsWithTaxIds(): Promise<{ id: string; taxId?: string; fiscalCode?: string; ficSyncStatus: Client['ficSyncStatus'] }[]> {
  const { data, error } = await supabaseServer
    .from('clients')
    .select('id, tax_id, fiscal_code, fic_sync_status')
    .is('deleted_at', null)
    .eq('fic_sync_status', 'not_synced');

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    taxId: row.tax_id ?? undefined,
    fiscalCode: row.fiscal_code ?? undefined,
    ficSyncStatus: row.fic_sync_status,
  }));
}

export type { User, Client, Job, Task, Invoice, Invitation, ActivityLog, Product };
