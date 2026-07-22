'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createDbContract,
  updateDbContract,
  softDeleteContract,
  getUnlinkedContracts,
  getAllClientNames,
  linkContractToClient,
} from '@/lib/db';
import type { Contract } from '@/lib/types';

type ContractFormData = Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'clientName'>;

const ContractSchema = z.object({
  clientId: z.string().optional().or(z.literal('')),
  clientNameRaw: z.string().min(1, 'Il nome cliente è obbligatorio'),
  site: z.string().optional().or(z.literal('')),
  status: z.enum(['attivo', 'disattivo', 'da_definire']),
  billingMonth: z.string().optional().or(z.literal('')),
  maintenanceWpAmount: z.coerce.number().optional().or(z.literal('')),
  hostingAmount: z.coerce.number().optional().or(z.literal('')),
  analyticsGdprAmount: z.coerce.number().optional().or(z.literal('')),
  cookieAmount: z.coerce.number().optional().or(z.literal('')),
  totalAmount: z.coerce.number().optional().or(z.literal('')),
  serviceDescription: z.string().optional().or(z.literal('')),
  package: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  provider: z.string().optional().or(z.literal('')),
  providerPlan: z.string().optional().or(z.literal('')),
  providerExpiryDate: z.string().optional().or(z.literal('')),
  providerCost: z.coerce.number().optional().or(z.literal('')),
});

function parseContractFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ContractSchema.parse(raw);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === '') {
      cleaned[key] = undefined;
    } else if (key === 'providerExpiryDate' && typeof value === 'string') {
      cleaned[key] = new Date(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as unknown as ContractFormData;
}

async function requireRole(resource: string, action: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return role;
}

export async function createContractAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'contracts', 'create')) {
    throw new Error('Non hai il permesso di creare contratti.');
  }

  const data = parseContractFormData(formData);
  await createDbContract({ ...data, createdBy: userId });
  redirect('/dashboard/contracts?saved=1');
}

export async function updateContractAction(id: string, formData: FormData) {
  await requireRole('contracts', 'update');
  const data = parseContractFormData(formData);
  await updateDbContract(id, data);
  redirect('/dashboard/contracts?saved=1');
}

export async function deleteContractAction(id: string) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'contracts')) {
    throw new Error('Solo un superadmin può eliminare un contratto.');
  }

  await softDeleteContract(id);
  redirect('/dashboard/contracts');
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface ContractClientMatchSuggestion {
  contractId: string;
  contractClientName: string;
  clientId: string;
  clientName: string;
}

/**
 * Propone corrispondenze univoche per nome tra i contratti senza cliente collegato
 * e l'anagrafica clienti. Non collega nulla: serve solo per la revisione manuale
 * (uso pensato per l'import iniziale dei contratti storici).
 */
export async function suggestContractClientMatchesAction(): Promise<ContractClientMatchSuggestion[]> {
  await requireRole('contracts', 'update');

  const [unlinked, clients] = await Promise.all([getUnlinkedContracts(), getAllClientNames()]);

  const byName = new Map<string, { id: string; name: string }[]>();
  for (const client of clients) {
    const key = normalizeName(client.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(client);
    byName.set(key, list);
  }

  const normalizedClients = clients.map((c) => ({ ...c, key: normalizeName(c.name) })).filter((c) => c.key);

  const suggestions: ContractClientMatchSuggestion[] = [];
  for (const contract of unlinked) {
    const key = normalizeName(contract.clientNameRaw);
    if (!key) continue;

    // Primo giro: corrispondenza esatta univoca.
    const exact = byName.get(key);
    if (exact && exact.length === 1) {
      suggestions.push({
        contractId: contract.id,
        contractClientName: contract.clientNameRaw,
        clientId: exact[0].id,
        clientName: exact[0].name,
      });
      continue;
    }
    if (exact && exact.length > 1) continue; // ambiguo, salta

    // Secondo giro (più permissivo): nome contratto contenuto nel nome cliente
    // o viceversa, solo se porta a un unico candidato univoco.
    const partial = normalizedClients.filter((c) => c.key.includes(key) || key.includes(c.key));
    if (partial.length === 1) {
      suggestions.push({
        contractId: contract.id,
        contractClientName: contract.clientNameRaw,
        clientId: partial[0].id,
        clientName: partial[0].name,
      });
    }
  }

  return suggestions;
}

/**
 * Collega in blocco le coppie contratto/cliente confermate dopo la revisione.
 */
export async function confirmContractClientMatchesAction(
  pairs: { contractId: string; clientId: string }[]
): Promise<number> {
  await requireRole('contracts', 'update');

  for (const pair of pairs) {
    await linkContractToClient(pair.contractId, pair.clientId);
  }

  revalidatePath('/dashboard/contracts');
  return pairs.length;
}
