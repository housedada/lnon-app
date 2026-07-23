'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  createProjectTask,
  updateProjectTaskStatus,
  toggleProjectTaskAssignee,
  updateProjectTaskTitle,
  reorderProjectTasks,
  softDeleteProjectTask,
  restoreProjectTask,
  getDeletedProjectTasks,
} from '@/lib/db';
import type { ProjectTask, ProjectTaskStatus } from '@/lib/types';

async function requireCanManage() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || !hasPermission(role, 'projects', 'update')) {
    throw new Error('Non hai il permesso di gestire i task.');
  }
  return userId;
}

export async function createProjectTaskAction(
  projectId: string,
  title: string,
  parentTaskId?: string | null
): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    const userId = await requireCanManage();
    if (!title.trim()) {
      return { success: false, message: 'Il titolo del task è obbligatorio.' };
    }
    const task = await createProjectTask({ projectId, title: title.trim(), createdBy: userId, parentTaskId: parentTaskId ?? null });
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Task creato.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella creazione del task.' };
  }
}

export async function updateProjectTaskTitleAction(
  taskId: string,
  title: string
): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    await requireCanManage();
    if (!title.trim()) {
      return { success: false, message: 'Il titolo del task è obbligatorio.' };
    }
    const task = await updateProjectTaskTitle(taskId, title.trim());
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Titolo aggiornato.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'aggiornamento del titolo.' };
  }
}

export async function updateProjectTaskStatusAction(
  taskId: string,
  status: ProjectTaskStatus
): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    await requireCanManage();
    const task = await updateProjectTaskStatus(taskId, status);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Stato aggiornato.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'aggiornamento dello stato.' };
  }
}

export async function toggleProjectTaskAssigneeAction(
  taskId: string,
  userId: string
): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    await requireCanManage();
    const task = await toggleProjectTaskAssignee(taskId, userId);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Assegnazione aggiornata.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'aggiornamento dell\'assegnazione.' };
  }
}

export async function reorderProjectTasksAction(orderedTaskIds: string[]): Promise<void> {
  await requireCanManage();
  await reorderProjectTasks(orderedTaskIds);
  revalidatePath('/dashboard/tasks');
}

export async function deleteProjectTaskAction(taskId: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireCanManage();
    await softDeleteProjectTask(taskId);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Task spostato nel cestino.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'eliminazione del task.' };
  }
}

export async function restoreProjectTaskAction(taskId: string): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    await requireCanManage();
    const task = await restoreProjectTask(taskId);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Task ripristinato.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nel ripristino del task.' };
  }
}

export async function getProjectTaskTrashAction(projectId: string): Promise<{ success: boolean; message: string; tasks?: ProjectTask[] }> {
  try {
    await requireCanManage();
    const tasks = await getDeletedProjectTasks(projectId);
    return { success: true, message: '', tasks };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nel caricamento del cestino.' };
  }
}
