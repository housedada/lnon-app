# Report — Approfondimenti — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere alla pagina Report quattro approfondimenti: rischio credito (fasce di aging + fatture più vecchie + link), top 5 clienti per fatturato, funnel di conversione lavori (per conteggio), scadenze provider in arrivo.

**Architecture:** Tre approfondimenti (rischio credito, top clienti, funnel) sono derivati riusando la stessa query fatture già presente in `getJobsForecast` — nessuna query aggiuntiva. Le scadenze provider sono una nuova funzione indipendente (non legata all'anno fiscale). Quattro nuovi componenti presentazionali puri, wired dentro `EconomicOverviewWidget.tsx`. Il link dal rischio credito alla lista Fatture richiede due nuovi filtri opzionali in `getProjectInvoices`.

**Tech Stack:** Next.js Server Components, Supabase via `lib/db.ts`.

## Global Constraints

- Nessuna query aggiuntiva per rischio credito/top clienti/funnel: derivano dalla stessa iterazione già presente in `getJobsForecast`.
- Le scadenze provider **non** sono filtrate per l'anno fiscale selezionato nel Report — solo per finestra di 30 giorni da oggi, contratti `status = 'attivo'`.
- Il link "vai a tutte le fatture non riscosse" filtra per anno fiscale del *lavoro* collegato (`jobFiscalYear`), non per anno della fattura.
- Se il filtro `jobFiscalYear` non trova alcun job per quell'anno, la query fatture deve restituire zero righe (mai "tutte le righe" per errore di query vuota).
- Tutte le stringhe utente sono in italiano.
- Stile visivo coerente con `EconomicOverviewWidget.tsx` esistente: stessi pattern `card-shadow`/`border-grid-border`/`detail-label`/`formatExact`, palette colori riusata (grigio `#9ca3af` per rischio basso/potenziale, ocra `#c9932f` per medio, rosso `#c94848` per alto rischio/uscite, verde `#2f9e6b` per fatturato).

---

### Task 1: Estendere `lib/db.ts` — rischio credito, top clienti, funnel, scadenze provider, filtri fatture

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Produces:
  - `export interface JobsForecastCreditRiskBucket { label: '0-30' | '30-60' | 'oltre 60'; amount: number }`
  - `export interface JobsForecastUnpaidInvoice { id: string; clientName: string; invoiceNumber?: string; amount: number; days: number }`
  - `export interface JobsForecastTopClient { clientName: string; amount: number }`
  - `export interface JobsForecastFunnel { potenziale: number; preventivato: number; confermato: number; fatturato: number; total: number }`
  - `JobsForecastResult` estesa con `creditRisk: { buckets: JobsForecastCreditRiskBucket[]; topUnpaid: JobsForecastUnpaidInvoice[] }`, `topClients: JobsForecastTopClient[]`, `funnel: JobsForecastFunnel`
  - `export async function getUpcomingProviderExpirations(days: number): Promise<Contract[]>`
  - `getProjectInvoices` con due filtri opzionali in più: `unpaid?: boolean`, `jobFiscalYear?: number`

- [ ] **Step 1: Sostituire `JobsForecastResult` e `getJobsForecast`**

Cercare il blocco esistente (inizia con `export interface JobsForecastResult {` e finisce con la chiusura di `getJobsForecast`, circa righe 504-576):

```typescript
export interface JobsForecastResult {
  rows: JobForecastRow[];
  totals: {
    potenziale: number;
    preventivato: number;
    confermato: number;
    fatturato: number;
    fatturatoNonRiscosso: number;
    speseFornitori: number;
  };
}

/**
 * Aggrega i lavori di un anno di competenza in Potenziale/Preventivato/
 * Confermato/Fatturato/Spese Fornitori per la Overview Lavori (Reports).
 */
export async function getJobsForecast(fiscalYear: number): Promise<JobsForecastResult> {
  const { data: jobRows, error: jobsError } = await supabaseServer
    .from('jobs')
    .select('*, clients(name), contracts(client_name_raw, clients(name))')
    .eq('fiscal_year', fiscalYear)
    .is('deleted_at', null)
    .neq('status', 'cancelled');
  if (jobsError) throw jobsError;

  const jobs = (jobRows ?? []).map(jobRowToJob);
  const jobIds = jobs.map((j) => j.id);

  let invoicedByJobId = new Map<string, number>();
  let unpaidByJobId = new Map<string, number>();
  if (jobIds.length > 0) {
    const { data: invoiceRows, error: invoicesError } = await supabaseServer
      .from('project_invoices')
      .select('job_id, net_amount, paid_at')
      .in('job_id', jobIds)
      .eq('status', 'fatturata');
    if (invoicesError) throw invoicesError;

    invoicedByJobId = (invoiceRows ?? []).reduce((map, row: any) => {
      if (!row.job_id) return map;
      map.set(row.job_id, (map.get(row.job_id) ?? 0) + Number(row.net_amount ?? 0));
      return map;
    }, new Map<string, number>());

    unpaidByJobId = (invoiceRows ?? []).reduce((map, row: any) => {
      if (!row.job_id || row.paid_at) return map;
      map.set(row.job_id, (map.get(row.job_id) ?? 0) + Number(row.net_amount ?? 0));
      return map;
    }, new Map<string, number>());
  }

  const totals = { potenziale: 0, preventivato: 0, confermato: 0, fatturato: 0, fatturatoNonRiscosso: 0, speseFornitori: 0 };
  const rows: JobForecastRow[] = [];

  for (const job of jobs) {
    const category = JOB_FORECAST_CATEGORY[job.status];
    if (!category) continue; // cancelled o stato non mappato

    const estimatedBudget = job.estimatedBudget ?? 0;
    const supplierCost = job.supplierCost ?? 0;
    const invoicedAmount = invoicedByJobId.get(job.id) ?? 0;
    const unpaidAmount = unpaidByJobId.get(job.id) ?? 0;

    totals[category] += estimatedBudget;
    totals.fatturato += invoicedAmount;
    totals.fatturatoNonRiscosso += unpaidAmount;
    totals.speseFornitori += supplierCost;

    rows.push({
      jobId: job.id,
      clientName: job.clientName ?? job.clientNameRaw ?? 'Cliente non specificato',
      title: job.title,
      status: job.status,
      category,
      estimatedBudget,
      supplierCost,
      invoicedAmount,
      margin: Math.round((invoicedAmount - supplierCost) * 100) / 100,
    });
  }

  return { rows, totals };
}
```

con:

```typescript
export interface JobsForecastCreditRiskBucket {
  label: '0-30' | '30-60' | 'oltre 60';
  amount: number;
}

export interface JobsForecastUnpaidInvoice {
  id: string;
  clientName: string;
  invoiceNumber?: string;
  amount: number;
  days: number;
}

export interface JobsForecastTopClient {
  clientName: string;
  amount: number;
}

export interface JobsForecastFunnel {
  potenziale: number;
  preventivato: number;
  confermato: number;
  fatturato: number;
  total: number;
}

export interface JobsForecastResult {
  rows: JobForecastRow[];
  totals: {
    potenziale: number;
    preventivato: number;
    confermato: number;
    fatturato: number;
    fatturatoNonRiscosso: number;
    speseFornitori: number;
  };
  creditRisk: {
    buckets: JobsForecastCreditRiskBucket[];
    topUnpaid: JobsForecastUnpaidInvoice[];
  };
  topClients: JobsForecastTopClient[];
  funnel: JobsForecastFunnel;
}

/**
 * Aggrega i lavori di un anno di competenza in Potenziale/Preventivato/
 * Confermato/Fatturato/Spese Fornitori per la Overview Lavori (Reports), più
 * rischio credito (aging fatture non riscosse), top clienti e funnel di
 * conversione: tutti derivati dalla stessa query fatture, nessuna query extra.
 */
export async function getJobsForecast(fiscalYear: number): Promise<JobsForecastResult> {
  const { data: jobRows, error: jobsError } = await supabaseServer
    .from('jobs')
    .select('*, clients(name), contracts(client_name_raw, clients(name))')
    .eq('fiscal_year', fiscalYear)
    .is('deleted_at', null)
    .neq('status', 'cancelled');
  if (jobsError) throw jobsError;

  const jobs = (jobRows ?? []).map(jobRowToJob);
  const jobIds = jobs.map((j) => j.id);

  type InvoiceForForecastRow = {
    id: string;
    job_id: string | null;
    client_id: string | null;
    client_name: string;
    net_amount: number;
    invoice_date: string | null;
    created_at: string;
    paid_at: string | null;
    invoice_number: string | null;
  };

  let invoiceRows: InvoiceForForecastRow[] = [];
  if (jobIds.length > 0) {
    const { data, error: invoicesError } = await supabaseServer
      .from('project_invoices')
      .select('id, job_id, client_id, client_name, net_amount, invoice_date, created_at, paid_at, invoice_number')
      .in('job_id', jobIds)
      .eq('status', 'fatturata');
    if (invoicesError) throw invoicesError;
    invoiceRows = data ?? [];
  }

  const invoicedByJobId = new Map<string, number>();
  const unpaidByJobId = new Map<string, number>();
  const amountByClient = new Map<string, JobsForecastTopClient>();
  const unpaidInvoices: JobsForecastUnpaidInvoice[] = [];
  const now = Date.now();

  for (const row of invoiceRows) {
    if (!row.job_id) continue;
    const amount = Number(row.net_amount ?? 0);
    invoicedByJobId.set(row.job_id, (invoicedByJobId.get(row.job_id) ?? 0) + amount);

    const clientKey = row.client_id ?? row.client_name;
    const existingClient = amountByClient.get(clientKey);
    amountByClient.set(clientKey, { clientName: row.client_name, amount: (existingClient?.amount ?? 0) + amount });

    if (!row.paid_at) {
      unpaidByJobId.set(row.job_id, (unpaidByJobId.get(row.job_id) ?? 0) + amount);
      const referenceDate = row.invoice_date ?? row.created_at;
      const days = Math.floor((now - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24));
      unpaidInvoices.push({
        id: row.id,
        clientName: row.client_name,
        invoiceNumber: row.invoice_number ?? undefined,
        amount,
        days,
      });
    }
  }

  const creditRiskBuckets: JobsForecastCreditRiskBucket[] = [
    { label: '0-30', amount: 0 },
    { label: '30-60', amount: 0 },
    { label: 'oltre 60', amount: 0 },
  ];
  for (const inv of unpaidInvoices) {
    if (inv.days <= 30) creditRiskBuckets[0].amount += inv.amount;
    else if (inv.days <= 60) creditRiskBuckets[1].amount += inv.amount;
    else creditRiskBuckets[2].amount += inv.amount;
  }

  const topUnpaid = [...unpaidInvoices].sort((a, b) => b.days - a.days).slice(0, 5);
  const topClients = [...amountByClient.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const totals = { potenziale: 0, preventivato: 0, confermato: 0, fatturato: 0, fatturatoNonRiscosso: 0, speseFornitori: 0 };
  const funnel: JobsForecastFunnel = { potenziale: 0, preventivato: 0, confermato: 0, fatturato: 0, total: 0 };
  const rows: JobForecastRow[] = [];

  for (const job of jobs) {
    const category = JOB_FORECAST_CATEGORY[job.status];
    if (!category) continue; // cancelled o stato non mappato

    const estimatedBudget = job.estimatedBudget ?? 0;
    const supplierCost = job.supplierCost ?? 0;
    const invoicedAmount = invoicedByJobId.get(job.id) ?? 0;
    const unpaidAmount = unpaidByJobId.get(job.id) ?? 0;

    totals[category] += estimatedBudget;
    totals.fatturato += invoicedAmount;
    totals.fatturatoNonRiscosso += unpaidAmount;
    totals.speseFornitori += supplierCost;

    funnel.total += 1;
    if (invoicedAmount > 0) {
      funnel.fatturato += 1;
    } else {
      funnel[category] += 1;
    }

    rows.push({
      jobId: job.id,
      clientName: job.clientName ?? job.clientNameRaw ?? 'Cliente non specificato',
      title: job.title,
      status: job.status,
      category,
      estimatedBudget,
      supplierCost,
      invoicedAmount,
      margin: Math.round((invoicedAmount - supplierCost) * 100) / 100,
    });
  }

  return {
    rows,
    totals,
    creditRisk: { buckets: creditRiskBuckets, topUnpaid },
    topClients,
    funnel,
  };
}
```

- [ ] **Step 2: Aggiungere `getUpcomingProviderExpirations`**

Aggiungere questa funzione subito dopo `getContractsStats` (cercare la chiusura di quella funzione, circa dopo la riga con `providerCostTotal: sum('provider_cost')` e la relativa `};`):

```typescript
/**
 * Contratti attivi con scadenza provider entro i prossimi `days` giorni
 * (finestra di calendario reale, non filtrata per anno fiscale).
 */
export async function getUpcomingProviderExpirations(days: number): Promise<Contract[]> {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);
  const todayStr = today.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const { data, error } = await supabaseServer
    .from('contracts')
    .select('*, clients(name)')
    .eq('status', 'attivo')
    .is('deleted_at', null)
    .gte('provider_expiry_date', todayStr)
    .lte('provider_expiry_date', endStr)
    .order('provider_expiry_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(contractRowToContract);
}
```

- [ ] **Step 3: Estendere i filtri di `getProjectInvoices`**

Sostituire la firma e il corpo esistenti:

```typescript
export async function getProjectInvoices(filters?: {
  search?: string;
  clientId?: string;
  archived?: boolean;
  archivedYear?: number;
  trashed?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: ProjectInvoice[]; total: number }> {
  let query = supabaseServer.from('project_invoices').select('*', { count: 'exact' });

  if (filters?.trashed) {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.is('deleted_at', null);
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
  }

  if (filters?.clientId) query = query.eq('client_id', filters.clientId);
  if (filters?.search) {
    query = query.or(`project_title.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit != null && filters?.offset != null) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(projectInvoiceRowToProjectInvoice), total: count ?? 0 };
}
```

con:

```typescript
export async function getProjectInvoices(filters?: {
  search?: string;
  clientId?: string;
  archived?: boolean;
  archivedYear?: number;
  trashed?: boolean;
  unpaid?: boolean;
  jobFiscalYear?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: ProjectInvoice[]; total: number }> {
  let query = supabaseServer.from('project_invoices').select('*', { count: 'exact' });

  if (filters?.trashed) {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.is('deleted_at', null);
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
  }

  if (filters?.clientId) query = query.eq('client_id', filters.clientId);
  if (filters?.search) {
    query = query.or(`project_title.ilike.%${filters.search}%,job_title.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`);
  }
  if (filters?.unpaid) {
    query = query.eq('status', 'fatturata').is('paid_at', null);
  }
  if (filters?.jobFiscalYear != null) {
    const { data: jobRows, error: jobsError } = await supabaseServer
      .from('jobs')
      .select('id')
      .eq('fiscal_year', filters.jobFiscalYear)
      .is('deleted_at', null);
    if (jobsError) throw jobsError;
    const jobIds = (jobRows ?? []).map((r: any) => r.id);
    // Nessun job per quell'anno: sentinella impossibile per garantire zero righe
    // invece di lasciare .in() con array vuoto (comportamento non affidabile).
    query = query.in('job_id', jobIds.length > 0 ? jobIds : ['00000000-0000-0000-0000-000000000000']);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit != null && filters?.offset != null) {
    query = query.range(filters.offset, filters.offset + filters.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(projectInvoiceRowToProjectInvoice), total: count ?? 0 };
}
```

- [ ] **Step 4: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/db.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts
git commit -m "Estende getJobsForecast (credito/top clienti/funnel), aggiunge getUpcomingProviderExpirations e filtri unpaid/jobFiscalYear"
```

---

### Task 2: Nuovi componenti presentazionali

**Files:**
- Create: `components/CreditRiskSection.tsx`
- Create: `components/TopClientsSection.tsx`
- Create: `components/ConversionFunnelSection.tsx`
- Create: `components/ProviderExpirationsSection.tsx`

**Interfaces:**
- Consumes: `JobsForecastResult['creditRisk']`, `JobsForecastResult['topClients']`, `JobsForecastResult['funnel']` (Task 1), `Contract` (`@/lib/types`, esistente).
- Produces: quattro componenti server (nessuna interattività client necessaria) con le firme indicate in ogni step.

- [ ] **Step 1: Creare `components/CreditRiskSection.tsx`**

```tsx
import Link from 'next/link';
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-30': '#9ca3af',
  '30-60': '#c9932f',
  'oltre 60': '#c94848',
};

export default function CreditRiskSection({
  fiscalYear,
  creditRisk,
}: {
  fiscalYear: number;
  creditRisk: JobsForecastResult['creditRisk'];
}) {
  const hasUnpaid = creditRisk.topUnpaid.length > 0;

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Rischio credito {fiscalYear} — fatture emesse non ancora riscosse
      </p>
      <div className="card-shadow overflow-hidden rounded-lg border border-grid-border bg-card-bg">
        <div className="grid grid-cols-3">
          {creditRisk.buckets.map((bucket) => (
            <div key={bucket.label} className="border-b border-r border-grid-border px-5 py-3 last:border-r-0">
              <p className="detail-label">{bucket.label} giorni</p>
              <p className="mt-1 text-xl font-semibold" style={{ color: BUCKET_COLORS[bucket.label] }}>
                {formatExact(bucket.amount)}
              </p>
            </div>
          ))}
        </div>
        {hasUnpaid ? (
          <div className="space-y-1.5 border-t border-grid-border px-5 py-3">
            {creditRisk.topUnpaid.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-xs text-secondary">
                <span className="truncate">
                  {inv.clientName}
                  {inv.invoiceNumber ? ` · N. ${inv.invoiceNumber}` : ''}
                </span>
                <span className="shrink-0 pl-3">
                  {formatExact(inv.amount)} · {inv.days}gg
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-grid-border px-5 py-3 text-xs text-secondary">Nessuna fattura non riscossa.</p>
        )}
        <Link
          href={`/dashboard/invoices?unpaid=1&jobFiscalYear=${fiscalYear}`}
          className="block border-t border-grid-border px-5 py-2.5 text-xs font-medium text-secondary transition hover:text-primary"
        >
          Vai a tutte le fatture non riscosse →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Creare `components/TopClientsSection.tsx`**

```tsx
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TopClientsSection({ topClients }: { topClients: JobsForecastResult['topClients'] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">Top 5 clienti per fatturato</p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        {topClients.length === 0 ? (
          <p className="py-2 text-xs text-secondary">Nessuna fattura emessa.</p>
        ) : (
          <ol className="space-y-2">
            {topClients.map((client, i) => (
              <li key={client.clientName} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate text-primary">
                  <span className="text-xs text-secondary">{i + 1}.</span>
                  {client.clientName}
                </span>
                <span className="shrink-0 pl-3 font-medium text-primary">{formatExact(client.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Creare `components/ConversionFunnelSection.tsx`**

```tsx
import type { JobsForecastResult } from '@/lib/db';

const STAGES: { key: keyof JobsForecastResult['funnel']; label: string; color: string }[] = [
  { key: 'potenziale', label: 'Potenziale', color: '#9ca3af' },
  { key: 'preventivato', label: 'Preventivato', color: '#6b7280' },
  { key: 'confermato', label: 'Confermato', color: '#1f2937' },
  { key: 'fatturato', label: 'Fatturato', color: '#2f9e6b' },
];

export default function ConversionFunnelSection({ funnel }: { funnel: JobsForecastResult['funnel'] }) {
  const conversionRate = funnel.total > 0 ? Math.round((funnel.fatturato / funnel.total) * 100) : 0;

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Funnel di conversione — {funnel.total} lavori nell&apos;anno
      </p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const count = funnel[stage.key] as number;
            const pct = funnel.total > 0 ? Math.round((count / funnel.total) * 100) : 0;
            return (
              <div key={stage.key} className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-secondary">{stage.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-grid-header-bg">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: stage.color }} />
                </div>
                <span className="w-10 shrink-0 text-right font-medium text-primary">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-secondary">
          <span className="font-semibold text-primary">{conversionRate}%</span> dei lavori dell&apos;anno è già fatturato
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Creare `components/ProviderExpirationsSection.tsx`**

```tsx
import type { Contract } from '@/lib/types';

function formatDate(value?: Date): string {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

function daysUntil(value?: Date): number {
  if (!value) return 0;
  return Math.ceil((value.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ProviderExpirationsSection({ contracts }: { contracts: Contract[] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
        Scadenze provider nei prossimi 30 giorni
      </p>
      <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
        {contracts.length === 0 ? (
          <p className="py-2 text-xs text-secondary">Nessuna scadenza nei prossimi 30 giorni.</p>
        ) : (
          <ul className="space-y-2">
            {contracts.map((contract) => (
              <li key={contract.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 truncate text-primary">
                  {contract.clientName ?? contract.clientNameRaw} · {contract.provider}
                  {contract.providerPlan ? ` (${contract.providerPlan})` : ''}
                </span>
                <span className="shrink-0 pl-3 text-xs text-secondary">
                  {formatDate(contract.providerExpiryDate)} · {daysUntil(contract.providerExpiryDate)}gg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore nei quattro nuovi file. Import di `JobsForecastResult` risolve correttamente perché il tipo è già esteso dal Task 1.

- [ ] **Step 6: Commit**

```bash
git add components/CreditRiskSection.tsx components/TopClientsSection.tsx components/ConversionFunnelSection.tsx components/ProviderExpirationsSection.tsx
git commit -m "Aggiunge i componenti presentazionali per i quattro approfondimenti Report"
```

---

### Task 3: Wire nel widget e nella pagina Report

**Files:**
- Modify: `components/EconomicOverviewWidget.tsx`
- Modify: `app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `CreditRiskSection`, `TopClientsSection`, `ConversionFunnelSection`, `ProviderExpirationsSection` (Task 2), `getUpcomingProviderExpirations` (Task 1).

- [ ] **Step 1: Aggiungere gli import in `EconomicOverviewWidget.tsx`**

In cima al file, dopo l'import esistente:

```typescript
import { Receipt, FileSignature, Clock } from 'lucide-react';
import type { JobsForecastResult, ContractsStats, HourlyContractsSummary } from '@/lib/db';
```

aggiungere:

```typescript
import CreditRiskSection from '@/components/CreditRiskSection';
import TopClientsSection from '@/components/TopClientsSection';
import ConversionFunnelSection from '@/components/ConversionFunnelSection';
import ProviderExpirationsSection from '@/components/ProviderExpirationsSection';
import type { Contract } from '@/lib/types';
```

- [ ] **Step 2: Estendere le props del componente**

Sostituire:

```typescript
export default function EconomicOverviewWidget({
  fiscalYear,
  contractsStats,
  hourlySummary,
  fixedExpensesTotal,
  jobsForecastTotals,
}: {
  fiscalYear: number;
  contractsStats: ContractsStats;
  hourlySummary: HourlyContractsSummary;
  fixedExpensesTotal: number;
  jobsForecastTotals: JobsForecastResult['totals'];
}) {
```

con:

```typescript
export default function EconomicOverviewWidget({
  fiscalYear,
  contractsStats,
  hourlySummary,
  fixedExpensesTotal,
  jobsForecastTotals,
  creditRisk,
  topClients,
  funnel,
  providerExpirations,
}: {
  fiscalYear: number;
  contractsStats: ContractsStats;
  hourlySummary: HourlyContractsSummary;
  fixedExpensesTotal: number;
  jobsForecastTotals: JobsForecastResult['totals'];
  creditRisk: JobsForecastResult['creditRisk'];
  topClients: JobsForecastResult['topClients'];
  funnel: JobsForecastResult['funnel'];
  providerExpirations: Contract[];
}) {
```

- [ ] **Step 3: Inserire `CreditRiskSection` dopo la sezione Potenziale**

Individuare il blocco esistente:

```tsx
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Potenziale {fiscalYear} — lavori non ancora fatturati (upside)
        </p>
        <div className="card-shadow grid grid-cols-3 overflow-hidden rounded-lg border border-grid-border bg-card-bg">
          <Tile label="Potenziale" value={jobsForecastTotals.potenziale} color={POTENZIALE_GRAYS[0]} />
          <Tile label="Preventivato" value={jobsForecastTotals.preventivato} color={POTENZIALE_GRAYS[1]} />
          <Tile label="Confermato" value={jobsForecastTotals.confermato} color={POTENZIALE_GRAYS[2]} />
        </div>
      </div>
```

subito dopo (prima del blocco "Uscite"), aggiungere:

```tsx
      <CreditRiskSection fiscalYear={fiscalYear} creditRisk={creditRisk} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClientsSection topClients={topClients} />
        <ConversionFunnelSection funnel={funnel} />
      </div>
```

- [ ] **Step 4: Inserire `ProviderExpirationsSection` dopo la sezione Uscite**

Individuare il blocco esistente:

```tsx
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">
          Uscite — spese fornitori lavori {fiscalYear}, spese fisse {fiscalYear}, costo provider contratti
        </p>
        <div className="card-shadow grid grid-cols-3 overflow-hidden rounded-lg border border-red-600/30 bg-red-600/5">
          <Tile label={`Spese fornitori ${fiscalYear}`} value={jobsForecastTotals.speseFornitori} color={USCITE_COLOR} />
          <Tile label={`Spese fisse ${fiscalYear}`} value={fixedExpensesTotal} color={USCITE_COLOR} />
          <Tile label="Costo provider contratti" value={contractsStats.providerCostTotal} color={USCITE_COLOR} />
        </div>
      </div>
```

subito dopo (prima del blocco "Margine stimato"), aggiungere:

```tsx
      <ProviderExpirationsSection contracts={providerExpirations} />
```

- [ ] **Step 5: Passare i nuovi dati da `app/dashboard/reports/page.tsx`**

Sostituire l'import esistente:

```typescript
import { getJobsForecast, getContractsStats, getHourlyContractsSummary, getFixedExpensesForYear, type JobForecastCategory } from '@/lib/db';
```

con:

```typescript
import {
  getJobsForecast,
  getContractsStats,
  getHourlyContractsSummary,
  getFixedExpensesForYear,
  getUpcomingProviderExpirations,
  type JobForecastCategory,
} from '@/lib/db';
```

Sostituire il blocco `Promise.all` esistente:

```typescript
  const [{ rows, totals }, contractsStats, hourlySummary, fixedExpenses] = await Promise.all([
    getJobsForecast(fiscalYear),
    getContractsStats(),
    getHourlyContractsSummary(),
    getFixedExpensesForYear(fiscalYear),
  ]);
```

con:

```typescript
  const [{ rows, totals, creditRisk, topClients, funnel }, contractsStats, hourlySummary, fixedExpenses, providerExpirations] = await Promise.all([
    getJobsForecast(fiscalYear),
    getContractsStats(),
    getHourlyContractsSummary(),
    getFixedExpensesForYear(fiscalYear),
    getUpcomingProviderExpirations(30),
  ]);
```

Sostituire il rendering esistente di `EconomicOverviewWidget`:

```tsx
      <EconomicOverviewWidget
        fiscalYear={fiscalYear}
        contractsStats={contractsStats}
        hourlySummary={hourlySummary}
        fixedExpensesTotal={fixedExpenses.total}
        jobsForecastTotals={totals}
      />
```

con:

```tsx
      <EconomicOverviewWidget
        fiscalYear={fiscalYear}
        contractsStats={contractsStats}
        hourlySummary={hourlySummary}
        fixedExpensesTotal={fixedExpenses.total}
        jobsForecastTotals={totals}
        creditRisk={creditRisk}
        topClients={topClients}
        funnel={funnel}
        providerExpirations={providerExpirations}
      />
```

- [ ] **Step 6: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/EconomicOverviewWidget.tsx` e `app/dashboard/reports/page.tsx`.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build pulita.

- [ ] **Step 8: Commit**

```bash
git add components/EconomicOverviewWidget.tsx app/dashboard/reports/page.tsx
git commit -m "Integra i quattro approfondimenti nella pagina Report"
```

---

### Task 4: Filtro `unpaid`/`jobFiscalYear` nella pagina Fatture e verifica end-to-end

**Files:**
- Modify: `app/dashboard/invoices/page.tsx`

**Interfaces:**
- Consumes: `getProjectInvoices` con `unpaid`/`jobFiscalYear` (Task 1).

- [ ] **Step 1: Estendere `SearchParams` e leggere i nuovi param**

Sostituire:

```typescript
type SearchParams = { q?: string; page?: string; pageSize?: string };
```

con:

```typescript
type SearchParams = { q?: string; page?: string; pageSize?: string; unpaid?: string; jobFiscalYear?: string };
```

- [ ] **Step 2: Passare i filtri a `getProjectInvoices` e leggere i nuovi param in `InvoicesListSection`**

Sostituire:

```typescript
  const { q, page } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;

  const { data: invoices, total } = await getProjectInvoices({ search: q, limit: pageSize, offset });
```

con:

```typescript
  const { q, page, unpaid, jobFiscalYear } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;
  const isUnpaidFilter = unpaid === '1';
  const jobFiscalYearNum = jobFiscalYear ? Number(jobFiscalYear) : undefined;

  const { data: invoices, total } = await getProjectInvoices({
    search: q,
    unpaid: isUnpaidFilter,
    jobFiscalYear: jobFiscalYearNum,
    limit: pageSize,
    offset,
  });
```

- [ ] **Step 3: Aggiungere il banner del filtro attivo**

`InvoicesListSection` riceve già `params` per intero, quindi i nuovi campi (`unpaid`, `jobFiscalYear`) sono già disponibili nella funzione dopo lo Step 2 — nessuna modifica alla firma della funzione.

Sostituire l'intero blocco `return (...)` di `InvoicesListSection` — da `return (` fino alla chiusura `);` seguita da `}` a fine funzione, cioè da:

```tsx
  return (
    <ListNavigator
      basePath="/dashboard/invoices"
      searchPlaceholder="Cerca per cliente, progetto o lavoro..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="fatture"
      extraTopControls={canManage ? <InvoicesBulkBar invoiceGroupKeys={invoiceGroupKeys} invoiceStatuses={invoiceStatuses} /> : undefined}
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: gridCols }}>
          {canManage && (
            <div className="list-cell-deco flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
              <InvoicesSelectAllCheckbox invoiceIds={invoices.map((i) => i.id)} />
            </div>
          )}
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Progetto</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Lavoro</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Imponibile</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">IVA</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Creata il</div>
          {canManage && <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />}

          {invoices.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessuna fattura trovata{q ? ` per “${q}”` : ''}. Le fatture vengono generate segnando un progetto come completato.
            </div>
          )}

          <LazyRevealRows total={invoices.length} enabled={pageSize > 25}>
            {invoices.map((invoice) => (
              <ProjectInvoiceRow key={invoice.id} invoice={invoice} isSuperadmin={isSuperadmin} canManage={canManage} showAmounts={showAmounts} />
            ))}
          </LazyRevealRows>
        </div>
      </div>
    </ListNavigator>
  );
}
```

a:

```tsx
  return (
    <>
      {isUnpaidFilter && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs text-secondary">
          <span>Filtro attivo: fatture non riscosse{jobFiscalYearNum ? ` del ${jobFiscalYearNum}` : ''}</span>
          <a href="/dashboard/invoices" className="font-medium text-secondary underline transition hover:text-primary">
            Rimuovi filtro
          </a>
        </div>
      )}
      <ListNavigator
        basePath="/dashboard/invoices"
        searchPlaceholder="Cerca per cliente, progetto o lavoro..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="fatture"
        extraTopControls={canManage ? <InvoicesBulkBar invoiceGroupKeys={invoiceGroupKeys} invoiceStatuses={invoiceStatuses} /> : undefined}
      >
        <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
          <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: gridCols }}>
            {canManage && (
              <div className="list-cell-deco flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
                <InvoicesSelectAllCheckbox invoiceIds={invoices.map((i) => i.id)} />
              </div>
            )}
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Progetto</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Lavoro</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Imponibile</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">IVA</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Totale</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Creata il</div>
            {canManage && <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />}

            {invoices.length === 0 && (
              <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
                Nessuna fattura trovata{q ? ` per “${q}”` : ''}. Le fatture vengono generate segnando un progetto come completato.
              </div>
            )}

            <LazyRevealRows total={invoices.length} enabled={pageSize > 25}>
              {invoices.map((invoice) => (
                <ProjectInvoiceRow key={invoice.id} invoice={invoice} isSuperadmin={isSuperadmin} canManage={canManage} showAmounts={showAmounts} />
              ))}
            </LazyRevealRows>
          </div>
        </div>
      </ListNavigator>
    </>
  );
}
```

- [ ] **Step 4: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `app/dashboard/invoices/page.tsx`.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build pulita.

- [ ] **Step 6: Verifica end-to-end manuale**

Run: `npm run dev`
Verifica manuale:
1. Aprire `/dashboard/reports`, verificare che compaiano le 4 nuove sezioni (Rischio credito con fasce+lista+link, Top clienti, Funnel, Scadenze provider) con dati coerenti rispetto a "Fatturato lavori" e "Potenziale" già visibili.
2. Cambiare anno fiscale dal selettore e verificare che rischio credito/top clienti/funnel si aggiornino.
3. Cliccare il link "Vai a tutte le fatture non riscosse": verificare l'atterraggio su `/dashboard/invoices?unpaid=1&jobFiscalYear=<anno>` con il banner del filtro visibile, solo fatture non riscosse di quell'anno in lista, e che "Rimuovi filtro" riporti alla lista completa.
4. Verificare le Scadenze provider con un contratto di test la cui `providerExpiryDate` cada entro 30 giorni da oggi, e che contratti `da_definire`/`disattivo` non compaiano anche con scadenza vicina.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/invoices/page.tsx
git commit -m "Aggiunge filtro fatture non riscosse per anno lavoro con banner rimovibile"
```

Al termine di questo task, se tutte le verifiche passano, procedere con **superpowers:finishing-a-development-branch**.
