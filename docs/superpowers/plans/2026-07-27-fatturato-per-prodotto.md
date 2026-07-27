# Sincronizzazione sottovoci FIC + pannello "Fatturato per prodotto" — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaricare da Fatture in Cloud le sottovoci reali (con prodotto) delle fatture emesse, salvarle localmente al posto delle `lineItems` generiche attuali, e mostrare nel Report un pannello con il fatturato aggregato per prodotto.

**Architecture:** Sincronizzazione manuale (bottone su Impostazioni FIC, solo superadmin) che sostituisce `ProjectInvoice.lineItems` con le sottovoci reali scaricate da FIC (`items_list`, con `product_id` mappato al prodotto locale via `Product.ficId`). Il pannello Report deriva il breakdown per prodotto dalla stessa query fatture già usata da `getJobsForecast` per rischio credito/top clienti/funnel (una colonna in più nel `select`, nessuna query aggiuntiva).

**Tech Stack:** Next.js Server Actions, Supabase via `lib/db.ts`, SDK `@fattureincloud/fattureincloud-ts-sdk` (`IssuedDocumentsApi.getIssuedDocument`).

## Global Constraints

- `ProjectInvoiceLineItem.productId` è opzionale: le fatture non sincronizzate restano compatibili, le loro voci finiscono nel bucket "Non categorizzato" nel pannello.
- La sincronizzazione è **manuale**, protetta da `requireSuperadmin()` (stesso helper già usato da `bulkMatchInvoicesAction` in `lib/actions/fic.ts`), mai automatica.
- Tollerante agli errori: se una singola fattura fallisce il recupero da FIC, si conta come errore e si continua con le altre (nessun abort totale), stesso stile di `bulkMatchInvoicesAction`.
- Nessuna query aggiuntiva per il breakdown prodotto oltre a quella fatture già esistente in `getJobsForecast` (più il lookup nomi prodotto, singola query separata già nello stile del progetto, es. `getProductColorsForJobs`).
- Tutte le stringhe utente sono in italiano.

---

### Task 1: Modello dati e wrapper FIC

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/fattureincloud.ts`

**Interfaces:**
- Produces:
  - `ProjectInvoiceLineItem.productId?: string` (nuovo campo opzionale)
  - `export async function getFicIssuedDocumentItems(ficInvoiceId: number): Promise<{ description: string; netAmount: number; ficProductId?: number }[]>`

- [ ] **Step 1: Estendere `ProjectInvoiceLineItem` in `lib/types.ts`**

Cercare:

```typescript
export interface ProjectInvoiceLineItem {
  label: string;
  netAmount: number;
}
```

Sostituire con:

```typescript
export interface ProjectInvoiceLineItem {
  label: string;
  netAmount: number;
  productId?: string;
}
```

- [ ] **Step 2: Aggiungere `getFicIssuedDocumentItems` in `lib/fattureincloud.ts`**

Subito dopo la chiusura di `listAllFicInvoices` (cercare `export async function listAllFicInvoices` e la sua chiusura `return all;\n}`), aggiungere:

```typescript
/**
 * Scarica le sottovoci reali (con id prodotto FiC) di una singola fattura
 * emessa su Fatture in Cloud, per collegare localmente sottovoce -> prodotto.
 */
export async function getFicIssuedDocumentItems(
  ficInvoiceId: number
): Promise<{ description: string; netAmount: number; ficProductId?: number }[]> {
  const { api, companyId } = await getIssuedDocumentsApi();
  const response = await api.getIssuedDocument(companyId, ficInvoiceId);
  const items = response.data.data?.items_list ?? [];
  return items.map((item) => ({
    description: item.description ?? item.name ?? 'Voce senza descrizione',
    netAmount: item.net_price ?? 0,
    ficProductId: item.product_id ?? undefined,
  }));
}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/types.ts` e `lib/fattureincloud.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/fattureincloud.ts
git commit -m "Aggiunge productId a ProjectInvoiceLineItem e getFicIssuedDocumentItems"
```

---

### Task 2: Estendere `lib/db.ts` — lookup, update e breakdown prodotto

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Produces:
  - `export async function getProjectInvoicesWithFicId(): Promise<{ id: string; ficInvoiceId: number }[]>`
  - `export async function updateProjectInvoiceLineItems(id: string, lineItems: ProjectInvoiceLineItem[]): Promise<void>`
  - `export async function getProductsWithFicId(): Promise<{ id: string; ficId: number }[]>`
  - `export interface JobsForecastProductBreakdown { productId: string | null; productName: string; amount: number }`
  - `JobsForecastResult` estesa con `productBreakdown: JobsForecastProductBreakdown[]`

- [ ] **Step 1: Aggiungere `getProjectInvoicesWithFicId`, `updateProjectInvoiceLineItems`, `getProductsWithFicId`**

Subito dopo la chiusura di `getProjectInvoicesWithNumber` (cercare `export async function getProjectInvoicesWithNumber` e la sua chiusura), aggiungere:

```typescript
/**
 * Fatture progetto già collegate a un documento reale su Fatture in Cloud,
 * per la sincronizzazione delle sottovoci con prodotto.
 */
export async function getProjectInvoicesWithFicId(): Promise<{ id: string; ficInvoiceId: number }[]> {
  const { data, error } = await supabaseServer
    .from('project_invoices')
    .select('id, fic_invoice_id')
    .not('fic_invoice_id', 'is', null)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).map((row: { id: string; fic_invoice_id: number }) => ({
    id: row.id,
    ficInvoiceId: row.fic_invoice_id,
  }));
}

/**
 * Sostituisce le lineItems di una fattura progetto (usato dalla
 * sincronizzazione sottovoci da Fatture in Cloud).
 */
export async function updateProjectInvoiceLineItems(id: string, lineItems: ProjectInvoiceLineItem[]): Promise<void> {
  const { error } = await supabaseServer.from('project_invoices').update({ line_items: lineItems }).eq('id', id);
  if (error) throw error;
}

/**
 * Prodotti locali con un fic_id collegato, per mappare le sottovoci FiC
 * (product_id) al prodotto locale corrispondente.
 */
export async function getProductsWithFicId(): Promise<{ id: string; ficId: number }[]> {
  const { data, error } = await supabaseServer
    .from('products')
    .select('id, fic_id')
    .not('fic_id', 'is', null)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).map((row: { id: string; fic_id: number }) => ({ id: row.id, ficId: row.fic_id }));
}
```

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/db.ts`.

- [ ] **Step 3: Commit intermedio**

```bash
git add lib/db.ts
git commit -m "Aggiunge getProjectInvoicesWithFicId, updateProjectInvoiceLineItems, getProductsWithFicId"
```

- [ ] **Step 4: Estendere `getJobsForecast` con il breakdown per prodotto**

Cercare `export interface JobsForecastResult {` e aggiungere, subito prima della sua definizione, la nuova interfaccia:

```typescript
export interface JobsForecastProductBreakdown {
  productId: string | null;
  productName: string;
  amount: number;
}

```

Poi, dentro `JobsForecastResult`, aggiungere il nuovo campo. Cercare:

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
  creditRisk: {
    buckets: JobsForecastCreditRiskBucket[];
    topUnpaid: JobsForecastUnpaidInvoice[];
  };
  topClients: JobsForecastTopClient[];
  funnel: JobsForecastFunnel;
}
```

sostituire con:

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
  creditRisk: {
    buckets: JobsForecastCreditRiskBucket[];
    topUnpaid: JobsForecastUnpaidInvoice[];
  };
  topClients: JobsForecastTopClient[];
  funnel: JobsForecastFunnel;
  productBreakdown: JobsForecastProductBreakdown[];
}
```

Nella query fatture dentro `getJobsForecast`, aggiungere `line_items` alla lista di colonne selezionate e al tipo `InvoiceForForecastRow`. Cercare:

```typescript
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
      .eq('status', 'fatturata')
      .is('deleted_at', null);
    if (invoicesError) throw invoicesError;
    invoiceRows = data ?? [];
  }
```

sostituire con:

```typescript
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
    line_items: ProjectInvoiceLineItem[] | null;
  };

  let invoiceRows: InvoiceForForecastRow[] = [];
  if (jobIds.length > 0) {
    const { data, error: invoicesError } = await supabaseServer
      .from('project_invoices')
      .select('id, job_id, client_id, client_name, net_amount, invoice_date, created_at, paid_at, invoice_number, line_items')
      .in('job_id', jobIds)
      .eq('status', 'fatturata')
      .is('deleted_at', null);
    if (invoicesError) throw invoicesError;
    invoiceRows = data ?? [];
  }
```

Dopo il blocco che costruisce `invoicedByJobId`/`unpaidByJobId`/`amountByClient`/`unpaidInvoices` (cercare la chiusura del `for (const row of invoiceRows) { ... }` esistente), aggiungere il calcolo del breakdown per prodotto. Cercare il punto subito dopo quel `for` (dove oggi inizia `const creditRiskBuckets`), e aggiungere PRIMA di `const creditRiskBuckets`:

```typescript
  const productNames = await getAllProductNames();
  const productNameById = new Map(productNames.map((p) => [p.id, p.name]));
  const amountByProduct = new Map<string, number>();
  let nonCategorizzato = 0;

  for (const row of invoiceRows) {
    for (const item of row.line_items ?? []) {
      const amount = Number(item.netAmount ?? 0);
      if (item.productId) {
        amountByProduct.set(item.productId, (amountByProduct.get(item.productId) ?? 0) + amount);
      } else {
        nonCategorizzato += amount;
      }
    }
  }

  const productBreakdown: JobsForecastProductBreakdown[] = [...amountByProduct.entries()]
    .map(([productId, amount]) => ({ productId, productName: productNameById.get(productId) ?? 'Prodotto sconosciuto', amount }))
    .sort((a, b) => b.amount - a.amount);
  if (nonCategorizzato > 0) {
    productBreakdown.push({ productId: null, productName: 'Non categorizzato', amount: nonCategorizzato });
  }

```

Infine, aggiungere `productBreakdown` al valore di ritorno. Cercare:

```typescript
  return {
    rows,
    totals,
    creditRisk: { buckets: creditRiskBuckets, topUnpaid },
    topClients,
    funnel,
  };
}
```

sostituire con:

```typescript
  return {
    rows,
    totals,
    creditRisk: { buckets: creditRiskBuckets, topUnpaid },
    topClients,
    funnel,
    productBreakdown,
  };
}
```

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/db.ts`. Se `ProjectInvoiceLineItem` non è già importato in cima al file, TypeScript segnalerà l'assenza: verificare l'import esistente da `@/lib/types` in cima a `lib/db.ts` e aggiungere `ProjectInvoiceLineItem` se manca.

- [ ] **Step 6: Commit**

```bash
git add lib/db.ts
git commit -m "Estende getJobsForecast con il breakdown fatturato per prodotto"
```

---

### Task 3: Azione di sincronizzazione

**Files:**
- Modify: `lib/actions/fic.ts`

**Interfaces:**
- Consumes: `getProjectInvoicesWithFicId`, `updateProjectInvoiceLineItems`, `getProductsWithFicId` (Task 2), `getFicIssuedDocumentItems` (Task 1).
- Produces: `export async function syncInvoiceLineItemsFromFicAction(): Promise<{ synced: number; errors: number }>`

- [ ] **Step 1: Estendere gli import**

Cercare il blocco import da `@/lib/db`:

```typescript
import {
  getClientById,
  getProductById,
  linkClientToFic as dbLinkClientToFic,
  linkProductToFic as dbLinkProductToFic,
  getAllClientsWithTaxIds,
  getProjectInvoicesWithNumber,
  linkProjectInvoiceToFic,
} from '@/lib/db';
```

sostituire con:

```typescript
import {
  getClientById,
  getProductById,
  linkClientToFic as dbLinkClientToFic,
  linkProductToFic as dbLinkProductToFic,
  getAllClientsWithTaxIds,
  getProjectInvoicesWithNumber,
  linkProjectInvoiceToFic,
  getProjectInvoicesWithFicId,
  updateProjectInvoiceLineItems,
  getProductsWithFicId,
} from '@/lib/db';
```

Cercare il blocco import da `@/lib/fattureincloud`:

```typescript
import {
  createFicClientFromLnonClient,
  createFicProductFromLnonProduct,
  registerFicDeleteWebhooks,
  searchFicClients,
  searchFicProducts,
  importAllFicProducts,
  listAllFicClients,
  listAllFicInvoices,
} from '@/lib/fattureincloud';
```

sostituire con:

```typescript
import {
  createFicClientFromLnonClient,
  createFicProductFromLnonProduct,
  registerFicDeleteWebhooks,
  searchFicClients,
  searchFicProducts,
  importAllFicProducts,
  listAllFicClients,
  listAllFicInvoices,
  getFicIssuedDocumentItems,
} from '@/lib/fattureincloud';
```

- [ ] **Step 2: Aggiungere `syncInvoiceLineItemsFromFicAction`**

Aggiungere in fondo al file (dopo l'ultima funzione esistente):

```typescript
/**
 * Scarica da Fatture in Cloud le sottovoci reali (con prodotto) di tutte le
 * fatture progetto già collegate a un documento FiC, sostituendo le lineItems
 * locali. Tollerante agli errori: una fattura che fallisce non blocca le
 * altre. Riproponibile: ogni click sovrascrive con l'ultimo stato FiC.
 */
export async function syncInvoiceLineItemsFromFicAction(): Promise<{ synced: number; errors: number }> {
  await requireSuperadmin();

  const [invoices, products] = await Promise.all([getProjectInvoicesWithFicId(), getProductsWithFicId()]);
  const productIdByFicId = new Map(products.map((p) => [p.ficId, p.id]));

  let synced = 0;
  let errors = 0;

  for (const invoice of invoices) {
    try {
      const items = await getFicIssuedDocumentItems(invoice.ficInvoiceId);
      const lineItems = items.map((item) => ({
        label: item.description,
        netAmount: item.netAmount,
        productId: item.ficProductId != null ? productIdByFicId.get(item.ficProductId) : undefined,
      }));
      await updateProjectInvoiceLineItems(invoice.id, lineItems);
      synced += 1;
    } catch (err) {
      errors += 1;
      console.warn(`[syncInvoiceLineItemsFromFicAction] fattura ${invoice.id}: errore nel recupero sottovoci da FIC`, err);
    }
  }

  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/invoices');
  return { synced, errors };
}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/actions/fic.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/fic.ts
git commit -m "Aggiunge syncInvoiceLineItemsFromFicAction"
```

---

### Task 4: Bottone di sincronizzazione su Impostazioni FIC

**Files:**
- Create: `components/SyncInvoiceLineItemsButton.tsx`
- Modify: `app/dashboard/settings/fic/page.tsx`

**Interfaces:**
- Consumes: `syncInvoiceLineItemsFromFicAction` (Task 3).

- [ ] **Step 1: Creare `components/SyncInvoiceLineItemsButton.tsx`**

Mirror strutturale di `components/BulkMatchInvoicesButton.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PackageSearch, Loader2 } from 'lucide-react';
import { syncInvoiceLineItemsFromFicAction } from '@/lib/actions/fic';
import { notify } from '@/lib/notify';

export default function SyncInvoiceLineItemsButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await syncInvoiceLineItemsFromFicAction();
      notify(`Sottovoci sincronizzate: ${res.synced} fatture, ${res.errors} errori.`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Sincronizza sottovoci fatture da Fatture in Cloud"
      title="Sincronizza sottovoci fatture da Fatture in Cloud"
      className="flex items-center gap-1.5 rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 size={15} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
      ) : (
        <PackageSearch size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
      Sincronizza sottovoci da FIC
    </button>
  );
}
```

- [ ] **Step 2: Aggiungere il bottone in `app/dashboard/settings/fic/page.tsx`**

Cercare l'import esistente:

```typescript
import BulkMatchInvoicesButton from '@/components/BulkMatchInvoicesButton';
```

aggiungere subito dopo:

```typescript
import SyncInvoiceLineItemsButton from '@/components/SyncInvoiceLineItemsButton';
```

Cercare dove `<BulkMatchInvoicesButton />` è renderizzato (dentro il blocco `{canManage && isSuperadmin && (...)}` o simile — cercare la riga esatta `<BulkMatchInvoicesButton />` nel file) e aggiungere subito dopo:

```tsx
<SyncInvoiceLineItemsButton />
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/SyncInvoiceLineItemsButton.tsx` e `app/dashboard/settings/fic/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/SyncInvoiceLineItemsButton.tsx app/dashboard/settings/fic/page.tsx
git commit -m "Aggiunge bottone sincronizzazione sottovoci FIC su Impostazioni FIC"
```

---

### Task 5: Pannello "Fatturato per prodotto" nel Report

**Files:**
- Create: `components/ProductBreakdownSection.tsx`
- Modify: `components/EconomicOverviewWidget.tsx`

**Interfaces:**
- Consumes: `JobsForecastResult['productBreakdown']` (Task 2).

- [ ] **Step 1: Creare `components/ProductBreakdownSection.tsx`**

```tsx
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProductBreakdownSection({
  fiscalYear,
  productBreakdown,
}: {
  fiscalYear: number;
  productBreakdown: JobsForecastResult['productBreakdown'];
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-secondary">Fatturato per prodotto {fiscalYear}</p>
      {productBreakdown.length === 0 ? (
        <div className="card-shadow rounded-lg border border-grid-border bg-card-bg px-5 py-3">
          <p className="py-2 text-xs text-secondary">Nessuna sottovoce sincronizzata da Fatture in Cloud.</p>
        </div>
      ) : (
        <div className="card-shadow grid grid-cols-2 overflow-hidden rounded-lg border border-grid-border bg-card-bg sm:grid-cols-4 lg:grid-cols-8">
          {productBreakdown.map((product) => (
            <div key={product.productId ?? 'non-categorizzato'} className="border-b border-r border-grid-border px-4 py-3 last:border-r-0">
              <p className="detail-label truncate">{product.productName}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{formatExact(product.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire in `components/EconomicOverviewWidget.tsx`**

Aggiungere l'import, subito dopo gli import esistenti dei componenti approfondimenti:

```typescript
import CreditRiskSection from '@/components/CreditRiskSection';
import TopClientsSection from '@/components/TopClientsSection';
import ConversionFunnelSection from '@/components/ConversionFunnelSection';
import ProviderExpirationsSection from '@/components/ProviderExpirationsSection';
```

sostituire con:

```typescript
import CreditRiskSection from '@/components/CreditRiskSection';
import TopClientsSection from '@/components/TopClientsSection';
import ConversionFunnelSection from '@/components/ConversionFunnelSection';
import ProviderExpirationsSection from '@/components/ProviderExpirationsSection';
import ProductBreakdownSection from '@/components/ProductBreakdownSection';
```

Cercare il blocco:

```tsx
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClientsSection topClients={topClients} />
        <ConversionFunnelSection funnel={funnel} />
      </div>
```

sostituire con:

```tsx
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClientsSection topClients={topClients} />
        <ConversionFunnelSection funnel={funnel} />
      </div>

      <ProductBreakdownSection fiscalYear={fiscalYear} productBreakdown={productBreakdown} />
```

Aggiungere `productBreakdown` alla firma delle props del componente. Cercare:

```typescript
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

sostituire con:

```typescript
  creditRisk,
  topClients,
  funnel,
  productBreakdown,
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
  productBreakdown: JobsForecastResult['productBreakdown'];
  providerExpirations: Contract[];
}) {
```

- [ ] **Step 3: Passare `productBreakdown` da `app/dashboard/reports/page.tsx`**

Cercare la destrutturazione del risultato di `getJobsForecast`:

```typescript
  const [{ rows, totals, creditRisk, topClients, funnel }, contractsStats, hourlySummary, fixedExpenses, providerExpirations] = await Promise.all([
```

sostituire con:

```typescript
  const [{ rows, totals, creditRisk, topClients, funnel, productBreakdown }, contractsStats, hourlySummary, fixedExpenses, providerExpirations] = await Promise.all([
```

Cercare il rendering di `EconomicOverviewWidget`:

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

sostituire con:

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
        productBreakdown={productBreakdown}
        providerExpirations={providerExpirations}
      />
```

- [ ] **Step 4: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build pulita.

- [ ] **Step 6: Verifica end-to-end manuale**

Run: `npm run dev`
Verifica manuale:
1. Su Impostazioni FIC, cliccare "Sincronizza sottovoci da FIC" e verificare il messaggio di riepilogo (N sincronizzate, N errori).
2. Su `/dashboard/invoices`, aprire l'anteprima di una fattura appena sincronizzata e verificare che mostri le sottovoci reali (non più il titolo progetto generico).
3. Su `/dashboard/reports`, verificare che compaia il pannello "Fatturato per prodotto {anno}" con importi coerenti; verificare che una fattura non ancora sincronizzata contribuisca a "Non categorizzato".
4. Cambiare anno fiscale e verificare che il pannello si aggiorni.

- [ ] **Step 7: Commit**

```bash
git add components/ProductBreakdownSection.tsx components/EconomicOverviewWidget.tsx app/dashboard/reports/page.tsx
git commit -m "Aggiunge il pannello Fatturato per prodotto nel Report"
```

Al termine di questo task, se tutte le verifiche passano, procedere con **superpowers:finishing-a-development-branch**.
