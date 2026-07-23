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
  Contract,
  Project,
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

function userRowToUser(row: Record<string, any>): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    googleId: row.google_id ?? undefined,
    role: row.role,
    isActive: row.is_active,
    color: row.color ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Ottieni tutti gli utenti (per la gestione accessi)
 */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabaseServer.from('users').select('*').order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(userRowToUser);
}

/**
 * Ottieni un utente per email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseServer.from('users').select('*').eq('email', email).maybeSingle();

  if (error) throw error;
  return data ? userRowToUser(data) : null;
}

/**
 * Aggiorna il ruolo di un utente esistente
 */
export async function updateUserRole(userId: string, role: User['role']): Promise<User> {
  const { data, error } = await supabaseServer
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return userRowToUser(data);
}

/**
 * Aggiorna il colore tag scelto dall'utente
 */
export async function updateUserColor(userId: string, color: string): Promise<User> {
  const { data, error } = await supabaseServer
    .from('users')
    .update({ color })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return userRowToUser(data);
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
  ficSyncStatus?: string;
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

  if (filters?.ficSyncStatus) {
    query = query.eq('fic_sync_status', filters.ficSyncStatus);
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

function jobRowToJob(row: Record<string, any>): Job {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    clientNameRaw: row.client_name_raw ?? undefined,
    contractId: row.contract_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    estimatedBudget: row.estimated_budget ?? undefined,
    actualBudget: row.actual_budget ?? undefined,
    currency: row.currency ?? 'EUR',
    startDate: row.start_date ? new Date(row.start_date) : undefined,
    endDate: row.end_date ? new Date(row.end_date) : undefined,
    assignedTo: row.assigned_to ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    approvedBy: row.approved_by ?? undefined,
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
    clientName: row.clients?.name ?? undefined,
    contractLabel: row.contracts ? (row.contracts.clients?.name ?? row.contracts.client_name_raw) : undefined,
    assignedToName: row.assigned_user?.name ?? undefined,
  };
}

function jobToRow(data: Partial<Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'clientName' | 'contractLabel' | 'assignedToName' | 'productIds'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.clientId !== undefined) row.client_id = data.clientId || null;
  if (data.clientNameRaw !== undefined) row.client_name_raw = data.clientNameRaw;
  if (data.contractId !== undefined) row.contract_id = data.contractId || null;
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.status !== undefined) row.status = data.status;
  if (data.estimatedBudget !== undefined) row.estimated_budget = data.estimatedBudget;
  if (data.actualBudget !== undefined) row.actual_budget = data.actualBudget;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.startDate !== undefined) row.start_date = data.startDate ? data.startDate.toISOString().slice(0, 10) : null;
  if (data.endDate !== undefined) row.end_date = data.endDate ? data.endDate.toISOString().slice(0, 10) : null;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo || null;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}

/**
 * Crea un nuovo lavoro
 */
export async function createDbJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'clientName' | 'contractLabel' | 'assignedToName'>): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .insert([jobToRow(jobData)])
    .select()
    .single();

  if (error) throw error;
  const job = jobRowToJob(data);
  if (jobData.productIds?.length) {
    await setJobProducts(job.id, jobData.productIds);
  }
  return job;
}

/**
 * Ottieni lavori (con filtri)
 */
export async function getJobs(filters?: {
  search?: string;
  clientId?: string;
  status?: string;
  assignedTo?: string;
  sync?: string; // 'synced' | 'not_synced'
  archived?: boolean;
  archivedYear?: number;
  trashed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: Job[]; total: number }> {
  let query = supabaseServer
    .from('jobs')
    .select('*, clients(name), contracts(client_name_raw, clients(name))');

  query = filters?.trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);

  if (filters?.archived) {
    query = query.not('archived_at', 'is', null);
    if (filters.archivedYear) {
      const start = `${filters.archivedYear}-01-01T00:00:00.000Z`;
      const end = `${filters.archivedYear + 1}-01-01T00:00:00.000Z`;
      query = query.gte('archived_at', start).lt('archived_at', end);
    }
  } else {
    query = query.is('archived_at', null);
  }

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.sync === 'synced') {
    query = query.not('client_id', 'is', null);
  } else if (filters?.sync === 'not_synced') {
    query = query.is('client_id', null);
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  let jobs = (data ?? []).map(jobRowToJob);

  // Ordinamento per priorità di stato (non alfabetico): lavori approvati
  // e in corso in cima, poi via via gli altri stati; a parità di stato,
  // i più recenti prima.
  const STATUS_PRIORITY: Record<Job['status'], number> = {
    approved: 0,
    in_progress: 1,
    pending_approval: 2,
    draft: 3,
    completed: 4,
    cancelled: 5,
  };
  jobs.sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const total = jobs.length;
  if (filters?.limit !== undefined || filters?.offset !== undefined) {
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? total;
    jobs = jobs.slice(offset, offset + limit);
  }

  return { data: jobs, total };
}

/**
 * Ottieni un lavoro per id, inclusi i prodotti collegati
 */
export async function getJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .select('*, clients(name), contracts(client_name_raw, clients(name))')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const job = jobRowToJob(data);
  job.productIds = await getJobProductIds(id);
  return job;
}

/**
 * Aggiorna un lavoro esistente
 */
export async function updateDbJob(
  id: string,
  jobData: Partial<Omit<Job, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'clientName' | 'contractLabel' | 'assignedToName'>>
): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .update(jobToRow(jobData))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (jobData.productIds !== undefined) {
    await setJobProducts(id, jobData.productIds);
  }
  return jobRowToJob(data);
}

/**
 * Soft delete di un lavoro
 */
export async function softDeleteJob(jobId: string): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return jobRowToJob(data);
}

/**
 * Ripristina un lavoro dal cestino (con i suoi sotto task, quando esisteranno,
 * dato che condivideranno lo stesso job_id e non vengono mai eliminati a parte)
 */
export async function restoreJob(jobId: string): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .update({ deleted_at: null })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return jobRowToJob(data);
}

/**
 * Sostituisce l'elenco dei prodotti collegati a un lavoro
 */
export async function setJobProducts(jobId: string, productIds: string[]): Promise<void> {
  const { error: deleteError } = await supabaseServer.from('job_products').delete().eq('job_id', jobId);
  if (deleteError) throw deleteError;

  if (productIds.length === 0) return;

  const { error: insertError } = await supabaseServer
    .from('job_products')
    .insert(productIds.map((productId) => ({ job_id: jobId, product_id: productId })));
  if (insertError) throw insertError;
}

/**
 * Ottieni gli id dei prodotti collegati a un lavoro
 */
export async function getJobProductIds(jobId: string): Promise<string[]> {
  const { data, error } = await supabaseServer.from('job_products').select('product_id').eq('job_id', jobId);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

/**
 * Approva un lavoro
 */
export async function approveJob(jobId: string, userId: string): Promise<Job> {
  const { data, error } = await supabaseServer
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
  return jobRowToJob(data);
}

/**
 * Archivia un lavoro completato (archivio annuale)
 */
export async function archiveJob(jobId: string): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return jobRowToJob(data);
}

/**
 * Archivia in blocco i lavori completati fra quelli indicati (ignora
 * silenziosamente eventuali id non completati o già archiviati).
 */
export async function archiveJobs(jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;
  const { data, error } = await supabaseServer
    .from('jobs')
    .update({ archived_at: new Date().toISOString() })
    .in('id', jobIds)
    .eq('status', 'completed')
    .is('archived_at', null)
    .select('id');

  if (error) throw error;
  return (data ?? []).length;
}

/**
 * Ripristina un lavoro archiviato nella lista attiva
 */
export async function unarchiveJob(jobId: string): Promise<Job> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .update({ archived_at: null })
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return jobRowToJob(data);
}

/**
 * Anni distinti per cui esistono lavori archiviati (per il filtro archivio)
 */
export async function getArchivedJobYears(): Promise<number[]> {
  const { data, error } = await supabaseServer.from('jobs').select('archived_at').not('archived_at', 'is', null);
  if (error) throw error;
  const years = new Set<number>();
  for (const row of data ?? []) {
    if (row.archived_at) years.add(new Date(row.archived_at).getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
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
  ficSyncStatus?: string;
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

  if (filters?.ficSyncStatus) {
    query = query.eq('fic_sync_status', filters.ficSyncStatus);
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
export async function getAllClientsWithTaxIds(): Promise<
  { id: string; name: string; taxId?: string; fiscalCode?: string; ficSyncStatus: Client['ficSyncStatus'] }[]
> {
  const { data, error } = await supabaseServer
    .from('clients')
    .select('id, name, tax_id, fiscal_code, fic_sync_status')
    .is('deleted_at', null)
    .eq('fic_sync_status', 'not_synced');

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    taxId: row.tax_id ?? undefined,
    fiscalCode: row.fiscal_code ?? undefined,
    ficSyncStatus: row.fic_sync_status,
  }));
}

function contractRowToContract(row: Record<string, any>): Contract {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    clientNameRaw: row.client_name_raw,
    site: row.site ?? undefined,
    status: row.status,
    billingMonth: row.billing_month ?? undefined,
    maintenanceWpAmount: row.maintenance_wp_amount ?? undefined,
    hostingAmount: row.hosting_amount ?? undefined,
    analyticsGdprAmount: row.analytics_gdpr_amount ?? undefined,
    cookieAmount: row.cookie_amount ?? undefined,
    totalAmount: row.total_amount ?? undefined,
    serviceDescription: row.service_description ?? undefined,
    package: row.package ?? undefined,
    notes: row.notes ?? undefined,
    provider: row.provider ?? undefined,
    providerPlan: row.provider_plan ?? undefined,
    providerExpiryDate: row.provider_expiry_date ? new Date(row.provider_expiry_date) : undefined,
    providerCost: row.provider_cost ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    clientName: row.clients?.name ?? undefined,
  };
}

function contractToRow(data: Partial<Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.clientId !== undefined) row.client_id = data.clientId;
  if (data.clientNameRaw !== undefined) row.client_name_raw = data.clientNameRaw;
  if (data.site !== undefined) row.site = data.site;
  if (data.status !== undefined) row.status = data.status;
  if (data.billingMonth !== undefined) row.billing_month = data.billingMonth;
  if (data.maintenanceWpAmount !== undefined) row.maintenance_wp_amount = data.maintenanceWpAmount;
  if (data.hostingAmount !== undefined) row.hosting_amount = data.hostingAmount;
  if (data.analyticsGdprAmount !== undefined) row.analytics_gdpr_amount = data.analyticsGdprAmount;
  if (data.cookieAmount !== undefined) row.cookie_amount = data.cookieAmount;
  if (data.totalAmount !== undefined) row.total_amount = data.totalAmount;
  if (data.serviceDescription !== undefined) row.service_description = data.serviceDescription;
  if (data.package !== undefined) row.package = data.package;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.provider !== undefined) row.provider = data.provider;
  if (data.providerPlan !== undefined) row.provider_plan = data.providerPlan;
  if (data.providerExpiryDate !== undefined) {
    row.provider_expiry_date = data.providerExpiryDate ? data.providerExpiryDate.toISOString().slice(0, 10) : null;
  }
  if (data.providerCost !== undefined) row.provider_cost = data.providerCost;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}

/**
 * Crea un nuovo contratto
 */
export async function createDbContract(
  contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>
): Promise<Contract> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .insert([contractToRow(contractData)])
    .select()
    .single();

  if (error) throw error;
  return contractRowToContract(data);
}

/**
 * Ottieni contratti (con filtri opzionali)
 */
export async function getContracts(filters?: {
  search?: string;
  status?: string;
  categories?: string[]; // 'maintenance' | 'hosting' | 'analytics' | 'cookie'
  limit?: number;
  offset?: number;
}): Promise<{ data: Contract[]; total: number }> {
  let query = supabaseServer
    .from('contracts')
    .select('*, clients(name)', { count: 'exact' })
    .is('deleted_at', null)
    .order('client_name_raw', { ascending: true });

  if (filters?.search) {
    query = query.or(`client_name_raw.ilike.%${filters.search}%,site.ilike.%${filters.search}%`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const categoryColumns: Record<string, string> = {
    maintenance: 'maintenance_wp_amount',
    hosting: 'hosting_amount',
    analytics: 'analytics_gdpr_amount',
    cookie: 'cookie_amount',
  };
  if (filters?.categories?.length) {
    const clauses = filters.categories
      .map((c) => categoryColumns[c])
      .filter(Boolean)
      .map((col) => `${col}.not.is.null`);
    if (clauses.length) query = query.or(clauses.join(','));
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: (data ?? []).map(contractRowToContract), total: count ?? 0 };
}

/**
 * Ottieni un contratto per id
 */
export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .select('*, clients(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return contractRowToContract(data);
}

/**
 * Aggiorna un contratto esistente
 */
export async function updateDbContract(
  id: string,
  contractData: Partial<Omit<Contract, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'clientName'>>
): Promise<Contract> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .update(contractToRow(contractData))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return contractRowToContract(data);
}

/**
 * Soft delete di un contratto
 */
export async function softDeleteContract(contractId: string): Promise<Contract> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contractId)
    .select()
    .single();

  if (error) throw error;
  return contractRowToContract(data);
}

/**
 * Ottieni tutti i contratti non ancora collegati a un cliente (per il match iniziale)
 */
export async function getUnlinkedContracts(): Promise<{ id: string; clientNameRaw: string }[]> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .select('id, client_name_raw')
    .is('deleted_at', null)
    .is('client_id', null);

  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, clientNameRaw: row.client_name_raw }));
}

/**
 * Collega un contratto a un cliente LNON esistente
 */
export async function linkContractToClient(contractId: string, clientId: string): Promise<void> {
  const { error } = await supabaseServer.from('contracts').update({ client_id: clientId }).eq('id', contractId);
  if (error) throw error;
}

/**
 * Ottieni i lavori (import storico) senza cliente collegato
 */
export async function getUnlinkedJobs(): Promise<{ id: string; clientNameRaw: string }[]> {
  const { data, error } = await supabaseServer
    .from('jobs')
    .select('id, client_name_raw')
    .is('deleted_at', null)
    .is('client_id', null)
    .not('client_name_raw', 'is', null);

  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, clientNameRaw: row.client_name_raw }));
}

/**
 * Collega un lavoro a un cliente LNON esistente
 */
export async function linkJobToClient(jobId: string, clientId: string): Promise<void> {
  const { error } = await supabaseServer.from('jobs').update({ client_id: clientId }).eq('id', jobId);
  if (error) throw error;
}

/**
 * Ottieni id+nome di tutti i clienti attivi, per select e match per nome
 */
export async function getAllClientNames(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabaseServer
    .from('clients')
    .select('id, name')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Ottieni id+nome di tutti i prodotti attivi, per la selezione multipla sui lavori
 */
export async function getAllProductNames(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabaseServer
    .from('products')
    .select('id, name')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Ottieni id+etichetta di tutti i contratti, per il collegamento opzionale sui lavori
 */
export async function getAllContractOptions(): Promise<{ id: string; label: string }[]> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .select('id, client_name_raw, site, clients(name)')
    .is('deleted_at', null)
    .order('client_name_raw', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    label: `${row.clients?.name ?? row.client_name_raw}${row.site ? ` — ${row.site}` : ''}`,
  }));
}

export interface ContractsStats {
  count: number;
  generalTotal: number;
  maintenanceTotal: number;
  hostingTotal: number;
  analyticsTotal: number;
  cookieTotal: number;
  providerCostTotal: number;
}

/**
 * Statistiche aggregate su tutti i contratti (totale generale, non filtrato).
 * Dataset piccolo (~150 righe): somma lato JS invece di aggregazione SQL.
 */
export async function getContractsStats(): Promise<ContractsStats> {
  const { data, error } = await supabaseServer
    .from('contracts')
    .select('total_amount, maintenance_wp_amount, hosting_amount, analytics_gdpr_amount, cookie_amount, provider_cost')
    .is('deleted_at', null);

  if (error) throw error;

  const rows = data ?? [];
  const sum = (key: string) => rows.reduce((acc, row: any) => acc + (row[key] ?? 0), 0);

  return {
    count: rows.length,
    generalTotal: sum('total_amount'),
    maintenanceTotal: sum('maintenance_wp_amount'),
    hostingTotal: sum('hosting_amount'),
    analyticsTotal: sum('analytics_gdpr_amount'),
    cookieTotal: sum('cookie_amount'),
    providerCostTotal: sum('provider_cost'),
  };
}

function projectRowToProject(row: Record<string, any>): Project {
  return {
    id: row.id,
    jobId: row.job_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    jobTitle: row.jobs?.title ?? undefined,
    assignedToName: row.assigned_user?.name ?? undefined,
  };
}

function projectToRow(data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'jobTitle' | 'assignedToName'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.jobId !== undefined) row.job_id = data.jobId || null;
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo || null;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}

/**
 * Crea un nuovo progetto
 */
export async function createDbProject(
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'jobTitle' | 'assignedToName'>
): Promise<Project> {
  const { data, error } = await supabaseServer.from('projects').insert([projectToRow(projectData)]).select().single();
  if (error) throw error;
  return projectRowToProject(data);
}

/**
 * Tutti i progetti (non eliminati) con l'assegnatario valorizzato, per la board Team
 */
export async function getAllAssignedProjects(): Promise<Project[]> {
  const { data, error } = await supabaseServer
    .from('projects')
    .select('*, jobs(title)')
    .is('deleted_at', null)
    .not('assigned_to', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(projectRowToProject);
}

/**
 * Progetti assegnati a un utente specifico, per la board Personale
 */
export async function getProjectsByAssignee(userId: string): Promise<Project[]> {
  const { data, error } = await supabaseServer
    .from('projects')
    .select('*, jobs(title)')
    .is('deleted_at', null)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(projectRowToProject);
}

/**
 * Ottieni un progetto per id
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabaseServer
    .from('projects')
    .select('*, jobs(title)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return projectRowToProject(data);
}

/**
 * Aggiorna un progetto esistente
 */
export async function updateDbProject(
  id: string,
  projectData: Partial<Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'jobTitle' | 'assignedToName'>>
): Promise<Project> {
  const { data, error } = await supabaseServer.from('projects').update(projectToRow(projectData)).eq('id', id).select().single();
  if (error) throw error;
  return projectRowToProject(data);
}

/**
 * Soft delete di un progetto
 */
export async function softDeleteProject(projectId: string): Promise<void> {
  const { error } = await supabaseServer.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId);
  if (error) throw error;
}

/**
 * Ordine colonne preferito dall'utente per la board Team (array di user id)
 */
export async function getTeamColumnOrder(userId: string): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from('board_column_orders')
    .select('team_column_order')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.team_column_order ?? [];
}

/**
 * Salva l'ordine colonne preferito dall'utente per la board Team
 */
export async function saveTeamColumnOrder(userId: string, orderedUserIds: string[]): Promise<void> {
  const { error } = await supabaseServer
    .from('board_column_orders')
    .upsert([{ user_id: userId, team_column_order: orderedUserIds, updated_at: new Date().toISOString() }], {
      onConflict: 'user_id',
    });
  if (error) throw error;
}

export type { User, Client, Job, Task, Invoice, Invitation, ActivityLog, Product, Contract, Project };
