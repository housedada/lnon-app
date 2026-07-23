'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  getProjectById,
  getJobById,
  getClientById,
  markProjectCompleted,
  archiveProjectInvoices,
  unarchiveProjectInvoice,
  softDeleteProjectInvoice,
  restoreProjectInvoice,
  mergeProjectInvoices,
} from '@/lib/db';
import type { ProjectInvoice } from '@/lib/types';

async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || role === 'dipendente') {
    throw new Error('Solo gli amministratori possono gestire le fatture.');
  }
  return { userId };
}

/**
 * Segna un progetto come completato: genera la relativa fattura interna (bozza),
 * visibile solo agli admin nella pagina Fatture. Importo = quota % del budget del
 * lavoro collegato (budget effettivo se presente, altrimenti stimato).
 */
export async function markProjectCompletedAction(projectId: string): Promise<{ success: boolean; message: string; invoice?: ProjectInvoice }> {
  try {
    const { userId } = await requireAdmin();
    const project = await getProjectById(projectId);
    if (!project) return { success: false, message: 'Progetto non trovato.' };
    if (project.completedAt) return { success: false, message: 'Questo progetto è già segnato come completato.' };

    const job = project.jobId ? await getJobById(project.jobId) : null;
    const jobBudget = job ? job.actualBudget ?? job.estimatedBudget ?? 0 : 0;
    const client = job?.clientId ? await getClientById(job.clientId) : null;
    const vatRate = client?.defaultVatRate ?? 22;
    const netAmount = Math.round(jobBudget * (project.budgetShare / 100) * 100) / 100;
    const clientName = job?.clientName ?? job?.clientNameRaw ?? 'Cliente non specificato';

    const invoice = await markProjectCompleted(projectId, {
      netAmount,
      vatRate,
      projectTitle: project.title,
      jobId: job?.id,
      jobTitle: job?.title,
      clientId: job?.clientId,
      clientName,
      createdBy: userId,
    });

    revalidatePath('/dashboard/tasks');
    revalidatePath('/dashboard/invoices');
    return { success: true, message: `Progetto completato: generata fattura da € ${invoice.totalAmount.toFixed(2)}.`, invoice };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nel completamento del progetto.' };
  }
}

export async function archiveProjectInvoicesAction(ids: string[]): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    await archiveProjectInvoices(ids);
    revalidatePath('/dashboard/invoices');
    return { success: true, message: `${ids.length} fattur${ids.length === 1 ? 'a archiviata' : 'e archiviate'}.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'archiviazione.' };
  }
}

export async function unarchiveProjectInvoiceAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    await unarchiveProjectInvoice(id);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/archive');
    return { success: true, message: 'Fattura ripristinata dall\'archivio.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nel ripristino.' };
  }
}

export async function deleteProjectInvoiceAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    await softDeleteProjectInvoice(id);
    revalidatePath('/dashboard/invoices');
    return { success: true, message: 'Fattura spostata nel cestino.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'eliminazione.' };
  }
}

export async function restoreProjectInvoiceAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    await restoreProjectInvoice(id);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/trash');
    return { success: true, message: 'Fattura ripristinata dal cestino.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nel ripristino.' };
  }
}

/**
 * Accorpa più fatture dello stesso cliente in un'unica fattura con più voci prodotto.
 * La generazione reale su Fatture in Cloud è prevista in un secondo momento.
 */
export async function mergeProjectInvoicesAction(ids: string[]): Promise<{ success: boolean; message: string; invoice?: ProjectInvoice }> {
  try {
    const { userId } = await requireAdmin();
    if (ids.length < 2) return { success: false, message: 'Seleziona almeno due fatture dello stesso cliente da accorpare.' };
    const invoice = await mergeProjectInvoices(ids, userId);
    revalidatePath('/dashboard/invoices');
    return { success: true, message: `Fatture accorpate in un'unica fattura da € ${invoice.totalAmount.toFixed(2)}.`, invoice };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'accorpamento delle fatture.' };
  }
}

export async function generateFicInvoiceAction(_id: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Generazione fattura su Fatture in Cloud: presto disponibile.' };
}
