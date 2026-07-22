'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { createDbProject, updateDbProject, softDeleteProject, saveTeamColumnOrder, getJobById } from '@/lib/db';

async function requireRole(resource: string, action: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return role;
}

const ProjectSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional().or(z.literal('')),
  assignedTo: z.string().optional().or(z.literal('')),
  jobId: z.string().optional().or(z.literal('')),
});

export async function createProjectAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'projects', 'create')) {
    return { success: false, message: 'Non hai il permesso di creare progetti.' };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = ProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dati non validi.' };
  }

  await createDbProject({
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    assignedTo: parsed.data.assignedTo || undefined,
    jobId: parsed.data.jobId || undefined,
    createdBy: userId,
  });

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard/jobs');
  return { success: true, message: 'Progetto creato.' };
}

/**
 * Crea un progetto a partire da un lavoro: titolo precompilato, collegato via jobId.
 * Un lavoro può avere più progetti collegati, assegnati a persone diverse.
 */
export async function createProjectFromJobAction(
  jobId: string,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'projects', 'create')) {
    return { success: false, message: 'Non hai il permesso di creare progetti.' };
  }

  const job = await getJobById(jobId);
  if (!job) {
    return { success: false, message: 'Lavoro non trovato.' };
  }

  const title = String(formData.get('title') || job.title);
  const assignedTo = String(formData.get('assignedTo') || '') || undefined;

  await createDbProject({
    title,
    jobId,
    assignedTo,
    createdBy: userId,
  });

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard/jobs');
  return { success: true, message: `Progetto "${title}" creato da questo lavoro.` };
}

export async function updateProjectAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  await requireRole('projects', 'update');

  const raw = Object.fromEntries(formData.entries());
  const parsed = ProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dati non validi.' };
  }

  await updateDbProject(id, {
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    assignedTo: parsed.data.assignedTo || undefined,
    jobId: parsed.data.jobId || undefined,
  });

  revalidatePath('/dashboard/tasks');
  return { success: true, message: 'Progetto aggiornato.' };
}

export async function deleteProjectAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'projects')) {
    return { success: false, message: 'Solo un superadmin può eliminare un progetto.' };
  }

  await softDeleteProject(id);
  revalidatePath('/dashboard/tasks');
  return { success: true, message: 'Progetto eliminato.' };
}

export async function saveTeamColumnOrderAction(orderedUserIds: string[]): Promise<void> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return;
  await saveTeamColumnOrder(userId, orderedUserIds);
}
