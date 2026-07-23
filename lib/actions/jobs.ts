'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createDbJob,
  updateDbJob,
  softDeleteJob,
  restoreJob,
  approveJob,
  archiveJob,
  archiveJobs,
  unarchiveJob,
  getUnlinkedJobs,
  getAllClientNames,
  linkJobToClient,
} from '@/lib/db';
import type { Job } from '@/lib/types';

type JobFormData = Omit<Job, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'clientName' | 'contractLabel' | 'assignedToName' | 'approvedAt' | 'approvedBy'>;

const JobSchema = z.object({
  clientId: z.string().min(1, 'Il cliente è obbligatorio'),
  contractId: z.string().optional().or(z.literal('')),
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled']),
  estimatedBudget: z.coerce.number().optional().or(z.literal('')),
  actualBudget: z.coerce.number().optional().or(z.literal('')),
  currency: z.string().default('EUR'),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  assignedTo: z.string().optional().or(z.literal('')),
  productIds: z.array(z.string()).optional(),
});

function parseJobFormData(formData: FormData) {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  raw.productIds = formData.getAll('productIds');
  const parsed = JobSchema.parse(raw);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === '') {
      cleaned[key] = undefined;
    } else if ((key === 'startDate' || key === 'endDate') && typeof value === 'string') {
      cleaned[key] = new Date(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as unknown as JobFormData;
}

async function requireRole(resource: string, action: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return role;
}

export async function createJobAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'jobs', 'create')) {
    throw new Error('Non hai il permesso di creare lavori.');
  }

  const data = parseJobFormData(formData);
  await createDbJob({ ...data, createdBy: userId });
  redirect('/dashboard/jobs?saved=1');
}

export async function updateJobAction(id: string, formData: FormData) {
  await requireRole('jobs', 'update');
  const data = parseJobFormData(formData);
  await updateDbJob(id, data);
  redirect('/dashboard/jobs?saved=1');
}

export async function deleteJobAction(id: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'jobs')) {
    throw new Error('Solo un superadmin può eliminare un lavoro.');
  }

  await softDeleteJob(id);
  redirect('/dashboard/jobs');
}

/**
 * Eliminazione (soft) da un contesto lista: niente redirect, torna un esito
 * per il toast e l'aggiornamento in-place della riga.
 */
export async function deleteJobFromListAction(jobId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'jobs')) {
    return { success: false, message: 'Solo un superadmin può eliminare un lavoro.' };
  }

  await softDeleteJob(jobId);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/jobs/trash');
  return { success: true, message: 'Lavoro spostato nel cestino.' };
}

export async function restoreJobAction(jobId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'jobs')) {
    return { success: false, message: 'Solo un superadmin può ripristinare un lavoro.' };
  }

  await restoreJob(jobId);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/jobs/trash');
  return { success: true, message: 'Lavoro ripristinato.' };
}

export async function approveJobAction(jobId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'jobs', 'approve')) {
    return { success: false, message: 'Non hai il permesso di approvare i lavori.' };
  }

  await approveJob(jobId, userId);
  revalidatePath('/dashboard/jobs');
  return { success: true, message: 'Lavoro approvato.' };
}

export async function archiveJobAction(jobId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'jobs', 'update')) {
    return { success: false, message: 'Non hai il permesso di archiviare i lavori.' };
  }

  await archiveJob(jobId);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/jobs/archive');
  return { success: true, message: 'Lavoro archiviato.' };
}

export async function archiveJobsAction(jobIds: string[]): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'jobs', 'update')) {
    return { success: false, message: 'Non hai il permesso di archiviare i lavori.' };
  }
  if (jobIds.length === 0) {
    return { success: false, message: 'Nessun lavoro selezionato.' };
  }

  const count = await archiveJobs(jobIds);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/jobs/archive');
  return {
    success: count > 0,
    message: count > 0 ? `${count} lavori archiviati.` : 'Nessun lavoro completato tra quelli selezionati.',
  };
}

export async function unarchiveJobAction(jobId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'jobs', 'update')) {
    return { success: false, message: 'Non hai il permesso di ripristinare i lavori.' };
  }

  await unarchiveJob(jobId);
  revalidatePath('/dashboard/jobs');
  revalidatePath('/dashboard/jobs/archive');
  return { success: true, message: 'Lavoro ripristinato.' };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface JobClientMatchSuggestion {
  jobId: string;
  jobClientName: string;
  clientId: string;
  clientName: string;
}

/**
 * Propone corrispondenze univoche per nome tra i lavori senza cliente collegato
 * e l'anagrafica clienti (stesso meccanismo già usato per i Contratti). Non
 * collega nulla: serve solo per la revisione manuale (import storico).
 */
export async function suggestJobClientMatchesAction(): Promise<JobClientMatchSuggestion[]> {
  await requireRole('jobs', 'update');

  const [unlinked, clients] = await Promise.all([getUnlinkedJobs(), getAllClientNames()]);

  const byName = new Map<string, { id: string; name: string }[]>();
  for (const client of clients) {
    const key = normalizeName(client.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(client);
    byName.set(key, list);
  }
  const normalizedClients = clients.map((c) => ({ ...c, key: normalizeName(c.name) })).filter((c) => c.key);

  const suggestions: JobClientMatchSuggestion[] = [];
  for (const job of unlinked) {
    const key = normalizeName(job.clientNameRaw);
    if (!key) continue;

    const exact = byName.get(key);
    if (exact && exact.length === 1) {
      suggestions.push({ jobId: job.id, jobClientName: job.clientNameRaw, clientId: exact[0].id, clientName: exact[0].name });
      continue;
    }
    if (exact && exact.length > 1) continue;

    const partial = normalizedClients.filter((c) => c.key.includes(key) || key.includes(c.key));
    if (partial.length === 1) {
      suggestions.push({ jobId: job.id, jobClientName: job.clientNameRaw, clientId: partial[0].id, clientName: partial[0].name });
    }
  }

  return suggestions;
}

/**
 * Collega in blocco le coppie lavoro/cliente confermate dopo la revisione.
 */
export async function confirmJobClientMatchesAction(pairs: { jobId: string; clientId: string }[]): Promise<number> {
  await requireRole('jobs', 'update');
  for (const pair of pairs) {
    await linkJobToClient(pair.jobId, pair.clientId);
  }
  revalidatePath('/dashboard/jobs');
  return pairs.length;
}

/**
 * Collega manualmente un singolo lavoro a un cliente scelto dall'utente.
 */
export async function linkJobToClientAction(jobId: string, clientId: string): Promise<void> {
  await requireRole('jobs', 'update');
  await linkJobToClient(jobId, clientId);
  revalidatePath('/dashboard/jobs');
}
