'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import {
  getProjectById,
  markProjectCompleted,
  archiveProjectInvoices,
  unarchiveProjectInvoice,
  softDeleteProjectInvoice,
  restoreProjectInvoice,
  mergeProjectInvoices,
  getProjectInvoiceById,
  getClientById,
  linkClientToFic,
  markProjectInvoiceIssuedOnFic,
  claimProjectInvoiceForFicGeneration,
  releaseProjectInvoiceFicClaim,
} from '@/lib/db';
import { createFicClientFromLnonClient, resolveFicVatType, createFicInvoiceDocument } from '@/lib/fattureincloud';
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
 * Segna un progetto come completato. La fatturazione resta sempre manuale.
 */
export async function markProjectCompletedAction(projectId: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    const project = await getProjectById(projectId);
    if (!project) return { success: false, message: 'Progetto non trovato.' };
    if (project.completedAt) return { success: false, message: 'Questo progetto è già segnato come completato.' };

    await markProjectCompleted(projectId);

    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Progetto segnato come completato.' };
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

/**
 * Genera su Fatture in Cloud il documento fattura reale (emesso e numerato:
 * l'API FIC non supporta bozze) a partire da una ProjectInvoice. Se il
 * cliente non è ancora collegato a FIC, tenta la sync automatica; se fallisce
 * o non viene trovata un'aliquota IVA compatibile, l'intera operazione si
 * interrompe senza creare nulla e senza modificare lo stato della fattura.
 */
export async function generateFicInvoiceAction(
  id: string,
  options?: { confirmOverwrite?: boolean }
): Promise<{ success: boolean; message: string; needsOverwriteConfirm?: boolean }> {
  try {
    await requireAdmin();

    const invoice = await getProjectInvoiceById(id);
    if (!invoice) return { success: false, message: 'Fattura non trovata.' };
    if (invoice.status !== 'da_fatturare') {
      return { success: false, message: 'Solo le fatture da fatturare possono essere generate su FIC.' };
    }
    if (invoice.ficInvoiceId && !options?.confirmOverwrite) {
      return {
        success: false,
        needsOverwriteConfirm: true,
        message: `Questa fattura ha già un documento collegato su Fatture in Cloud (N. ${invoice.invoiceNumber ?? invoice.ficInvoiceId}).`,
      };
    }
    if (!invoice.clientId) {
      return { success: false, message: 'La fattura non è collegata a un cliente.' };
    }

    const client = await getClientById(invoice.clientId);
    if (!client) return { success: false, message: 'Cliente non trovato.' };

    const claimed = await claimProjectInvoiceForFicGeneration(invoice.id);
    if (!claimed) {
      return { success: false, message: 'Generazione già in corso o completata da un\'altra richiesta.' };
    }

    let ficClientId = client.ficId;
    if (!ficClientId) {
      try {
        ficClientId = await createFicClientFromLnonClient(client);
        await linkClientToFic(client.id, ficClientId);
      } catch (err) {
        await releaseProjectInvoiceFicClaim(invoice.id);
        return {
          success: false,
          message: `Impossibile sincronizzare il cliente su Fatture in Cloud: ${err instanceof Error ? err.message : 'errore sconosciuto'}.`,
        };
      }
    }

    try {
      const vatTypeId = await resolveFicVatType(invoice.vatRate);

      const created = await createFicInvoiceDocument({
        ficClientId,
        vatTypeId,
        items: invoice.lineItems.map((item) => ({ label: item.label, netAmount: item.netAmount })),
      });

      await markProjectInvoiceIssuedOnFic(invoice.id, {
        ficInvoiceId: created.ficId,
        invoiceNumber: created.number,
        invoiceDate: created.date,
      });

      revalidatePath('/dashboard/invoices');
      return { success: true, message: `Fattura generata su Fatture in Cloud (N. ${created.number}).` };
    } catch (err) {
      await releaseProjectInvoiceFicClaim(invoice.id);
      throw err;
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella generazione della fattura su Fatture in Cloud.' };
  }
}

/**
 * Genera su Fatture in Cloud più fatture in un colpo solo. Le fatture già
 * collegate a un documento FIC vengono saltate (nessuna sovrascrittura
 * silenziosa in bulk): per rigenerarle serve la generazione singola con
 * conferma esplicita.
 */
export async function generateFicInvoicesBulkAction(
  ids: string[]
): Promise<{ success: boolean; message: string; results: { id: string; success: boolean; skipped?: boolean; message: string }[] }> {
  try {
    await requireAdmin();
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Errore nella generazione delle fatture su Fatture in Cloud.',
      results: [],
    };
  }

  const results: { id: string; success: boolean; skipped?: boolean; message: string }[] = [];

  for (const id of ids) {
    const invoice = await getProjectInvoiceById(id);
    if (invoice?.ficInvoiceId) {
      results.push({ id, success: false, skipped: true, message: 'Già generata, saltata (usa la generazione singola per sovrascrivere).' });
      continue;
    }
    const res = await generateFicInvoiceAction(id);
    results.push({ id, success: res.success, message: res.message });
  }

  const successCount = results.filter((r) => r.success).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const failCount = results.length - successCount - skippedCount;
  revalidatePath('/dashboard/invoices');

  const parts = [`${successCount} generat${successCount === 1 ? 'a' : 'e'} su FIC`];
  if (skippedCount > 0) parts.push(`${skippedCount} già generat${skippedCount === 1 ? 'a' : 'e'} (saltat${skippedCount === 1 ? 'a' : 'e'})`);
  if (failCount > 0) parts.push(`${failCount} fallit${failCount === 1 ? 'a' : 'e'}`);

  return {
    success: successCount > 0,
    message: parts.join(', ') + '.',
    results,
  };
}
