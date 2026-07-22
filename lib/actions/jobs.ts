'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { createDbJob, updateDbJob, softDeleteJob, approveJob } from '@/lib/db';
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
