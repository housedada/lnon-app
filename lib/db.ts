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

/**
 * Crea un nuovo cliente
 */
export async function createDbClient(
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
) {
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ottieni tutti i clienti (con filtri opzionali)
 */
export async function getClients(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .is('deleted_at', null) // Non includiamo soft-deleted
    .order('created_at', { ascending: false });

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
  return { data, total: count };
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
export async function softDeleteClient(clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return data;
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

export type { User, Client, Job, Task, Invoice, Invitation, ActivityLog };
