# Emissione fattura su Fatture in Cloud — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare l'azione "Genera su FIC" (oggi stub) alla creazione reale di un documento fattura su Fatture in Cloud, singola o in blocco, con conferma esplicita e aggiornamento coerente dello stato della fattura LNON.

**Architecture:** Nuovo layer in `lib/fattureincloud.ts` (risoluzione VAT type + creazione documento), nuova funzione di persistenza in `lib/db.ts`, `generateFicInvoiceAction`/`generateFicInvoicesBulkAction` in `lib/actions/projectInvoices.ts` come orchestratori, UI di conferma a doppio step in `ProjectInvoiceRow.tsx`, `InvoicePreviewModal.tsx` e `InvoicesBulkBar.tsx`.

**Tech Stack:** Next.js Server Actions, Supabase (`supabaseServer`), SDK `@fattureincloud/fattureincloud-ts-sdk` (`InfoApi.listVatTypes`, `IssuedDocumentsApi.createIssuedDocument`).

## Global Constraints

- L'API FIC non supporta bozze: ogni documento creato via `createIssuedDocument` nasce emesso e numerato definitivamente. Nessun tentativo di simulare uno stato bozza.
- Alla riuscita della generazione, `ProjectInvoice.status` passa a `'fatturata'` (mai lasciata `'da_fatturare'`).
- Se la creazione del cliente FIC fallisce, l'intera operazione si interrompe senza creare alcun documento e senza modificare lo stato della fattura.
- Nessuno stato parziale: o l'intera sequenza (cliente + documento + update fattura) riesce, o la `ProjectInvoice` resta esattamente come prima (eccetto l'eventuale `client.ficId` collegato, che è riusabile e non è un problema lasciarlo).
- Permessi: si riusa `requireAdmin()` già esistente in `lib/actions/projectInvoices.ts` (blocca `dipendente`), nessuna nuova voce nella matrice permessi.
- Ogni messaggio d'errore/successo è in italiano, mostrato via `notify()` (pattern esistente).
- Riuso di componenti esistenti: `DoubleConfirmModal` per la conferma, `createFicClientFromLnonClient`/`linkClientToFic` per la sync cliente, `getIssuedDocumentsApi()` (privata) come pattern per il nuovo `getInfoApi()`.
- **Non rinominare né modificare la funzione esistente `linkProjectInvoiceToFic(id, ficInvoiceId)`** (usata da `lib/actions/fic.ts` per il match storico bulk): la nuova persistenza usa un nome diverso, `markProjectInvoiceIssuedOnFic`.

---

### Task 1: Wrapper FIC — risoluzione aliquota IVA e creazione documento fattura

**Files:**
- Modify: `lib/fattureincloud.ts`

**Interfaces:**
- Consumes: `getValidAccessToken()` (già esistente, ritorna `{accessToken, companyId}`), `Configuration` da `@fattureincloud/fattureincloud-ts-sdk`.
- Produces:
  - `export async function resolveFicVatType(vatRatePercent: number): Promise<number>` — ritorna l'id del vat type FIC con `value === vatRatePercent`, lancia `Error` con messaggio esplicito se non trovato.
  - `export async function createFicInvoiceDocument(params: { ficClientId: number; vatTypeId: number; items: { label: string; netAmount: number }[] }): Promise<{ ficId: number; number: string; date: string }>` — crea il documento fattura su FIC e ritorna id, numero (come stringa) e data.

- [ ] **Step 1: Aggiungere l'import di `InfoApi` e i tipi necessari**

In `lib/fattureincloud.ts`, estendere l'import esistente da `@fattureincloud/fattureincloud-ts-sdk` (che oggi importa `Configuration, ClientsApi, ProductsApi, UserApi, WebhooksApi, IssuedDocumentsApi, ListIssuedDocumentsTypeEnum, Scope, OAuth2AuthorizationCodeManager, Condition, Disjunction, Operator, EventType`) aggiungendo `InfoApi` e `IssuedDocumentType`:

```typescript
import {
  Configuration,
  ClientsApi,
  ProductsApi,
  UserApi,
  WebhooksApi,
  IssuedDocumentsApi,
  ListIssuedDocumentsTypeEnum,
  InfoApi,
  IssuedDocumentType,
  Scope,
  OAuth2AuthorizationCodeManager,
  Condition,
  Disjunction,
  Operator,
  EventType,
} from '@fattureincloud/fattureincloud-ts-sdk';
```

- [ ] **Step 2: Aggiungere l'helper privato `getInfoApi()`**

Subito dopo la funzione privata esistente `getIssuedDocumentsApi()` (che si trova appena sopra `listAllFicInvoices`), aggiungere:

```typescript
async function getInfoApi(): Promise<{ api: InfoApi; companyId: number }> {
  const { accessToken, companyId } = await getValidAccessToken();
  const api = new InfoApi(new Configuration({ accessToken }));
  return { api, companyId };
}
```

- [ ] **Step 3: Implementare `resolveFicVatType`**

Aggiungere in fondo al file (dopo `listAllFicInvoices` e prima della sezione webhook, oppure in fondo al file — la posizione esatta non è rilevante purché sia un export di primo livello):

```typescript
/**
 * Cerca tra le aliquote IVA configurate sull'account Fatture in Cloud
 * connesso quella con percentuale uguale a vatRatePercent (es. 22 per il 22%).
 * Nessun fallback: se non esiste, l'emissione fattura deve fermarsi.
 */
export async function resolveFicVatType(vatRatePercent: number): Promise<number> {
  const { api, companyId } = await getInfoApi();
  const response = await api.listVatTypes(companyId);
  const vatTypes = response.data.data ?? [];
  const match = vatTypes.find((v) => v.value === vatRatePercent);
  if (!match?.id) {
    throw new Error(`Nessuna aliquota IVA del ${vatRatePercent}% configurata su Fatture in Cloud.`);
  }
  return match.id;
}
```

- [ ] **Step 4: Implementare `createFicInvoiceDocument`**

Subito dopo `resolveFicVatType`:

```typescript
/**
 * Crea un documento fattura definitivo (non una bozza: l'API di Fatture in
 * Cloud non supporta uno stato bozza) su Fatture in Cloud, con una riga per
 * ogni item passato. Non invia email né allega nulla: il documento viene
 * solo creato.
 */
export async function createFicInvoiceDocument(params: {
  ficClientId: number;
  vatTypeId: number;
  items: { label: string; netAmount: number }[];
}): Promise<{ ficId: number; number: string; date: string }> {
  const { api, companyId } = await getIssuedDocumentsApi();
  const today = new Date().toISOString().slice(0, 10);

  const response = await api.createIssuedDocument(companyId, {
    data: {
      type: IssuedDocumentType.Invoice,
      entity: { id: params.ficClientId },
      date: today,
      items_list: params.items.map((item) => ({
        description: item.label,
        qty: 1,
        net_price: item.netAmount,
        vat: { id: params.vatTypeId },
      })),
    },
  });

  const created = response.data.data;
  if (!created?.id || created.number == null) {
    throw new Error('Fatture in Cloud non ha restituito i dati del documento creato.');
  }

  return {
    ficId: created.id,
    number: String(created.number),
    date: created.date ?? today,
  };
}
```

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/fattureincloud.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/fattureincloud.ts
git commit -m "Aggiunge risoluzione VAT type e creazione documento fattura FIC"
```

---

### Task 2: Persistenza — collegare l'esito FIC alla fattura LNON

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Consumes: tipo `ProjectInvoice` (`lib/types.ts:224`), funzione privata `projectInvoiceRowToProjectInvoice` già esistente in `lib/db.ts`.
- Produces:
  - `export async function getProjectInvoiceById(id: string): Promise<ProjectInvoice | null>`
  - `export async function markProjectInvoiceIssuedOnFic(id: string, data: { ficInvoiceId: number; invoiceNumber: string; invoiceDate: string }): Promise<ProjectInvoice>`

- [ ] **Step 1: Aggiungere `getProjectInvoiceById`**

Subito prima di `export async function getProjectInvoices(filters?: {` (linea 1907 circa), aggiungere:

```typescript
export async function getProjectInvoiceById(id: string): Promise<ProjectInvoice | null> {
  const { data, error } = await supabaseServer
    .from('project_invoices')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return projectInvoiceRowToProjectInvoice(data);
}
```

- [ ] **Step 2: Aggiungere `markProjectInvoiceIssuedOnFic`**

Subito dopo la funzione esistente `linkProjectInvoiceToFic` (circa linea 2058, che NON va toccata — resta usata da `lib/actions/fic.ts` per il match storico), aggiungere:

```typescript
/**
 * Registra l'esito della generazione di un documento fattura reale su
 * Fatture in Cloud (emesso e numerato, non una bozza): collega l'id FIC,
 * aggiorna numero/data con quelli restituiti da FIC e porta lo stato a
 * "fatturata". Distinta da linkProjectInvoiceToFic, che serve solo al
 * match storico bulk e non tocca lo stato.
 */
export async function markProjectInvoiceIssuedOnFic(
  id: string,
  data: { ficInvoiceId: number; invoiceNumber: string; invoiceDate: string }
): Promise<ProjectInvoice> {
  const { data: row, error } = await supabaseServer
    .from('project_invoices')
    .update({
      fic_invoice_id: data.ficInvoiceId,
      invoice_number: data.invoiceNumber,
      invoice_date: data.invoiceDate,
      status: 'fatturata',
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return projectInvoiceRowToProjectInvoice(row);
}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/db.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "Aggiunge getProjectInvoiceById e markProjectInvoiceIssuedOnFic"
```

---

### Task 3: Orchestrazione — `generateFicInvoiceAction` e `generateFicInvoicesBulkAction`

**Files:**
- Modify: `lib/actions/projectInvoices.ts`

**Interfaces:**
- Consumes:
  - `getProjectInvoiceById`, `getClientById`, `linkClientToFic`, `markProjectInvoiceIssuedOnFic` (`@/lib/db`)
  - `createFicClientFromLnonClient`, `resolveFicVatType`, `createFicInvoiceDocument` (`@/lib/fattureincloud`)
  - `requireAdmin()` già esistente nello stesso file
- Produces:
  - `export async function generateFicInvoiceAction(id: string, options?: { confirmOverwrite?: boolean }): Promise<{ success: boolean; message: string; needsOverwriteConfirm?: boolean }>`
  - `export async function generateFicInvoicesBulkAction(ids: string[]): Promise<{ success: boolean; message: string; results: { id: string; success: boolean; message: string }[] }>`

- [ ] **Step 1: Sostituire lo stub `generateFicInvoiceAction` con l'implementazione reale**

Aggiornare gli import in cima al file da:

```typescript
import {
  getProjectById,
  markProjectCompleted,
  archiveProjectInvoices,
  unarchiveProjectInvoice,
  softDeleteProjectInvoice,
  restoreProjectInvoice,
  mergeProjectInvoices,
} from '@/lib/db';
import type { ProjectInvoice } from '@/lib/types';
```

a:

```typescript
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
} from '@/lib/db';
import { createFicClientFromLnonClient, resolveFicVatType, createFicInvoiceDocument } from '@/lib/fattureincloud';
import type { ProjectInvoice } from '@/lib/types';
```

Sostituire interamente il blocco finale del file (righe 107-109, lo stub `generateFicInvoiceAction`) con:

```typescript
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

    let ficClientId = client.ficId;
    if (!ficClientId) {
      try {
        ficClientId = await createFicClientFromLnonClient(client);
        await linkClientToFic(client.id, ficClientId);
      } catch (err) {
        return {
          success: false,
          message: `Impossibile sincronizzare il cliente su Fatture in Cloud: ${err instanceof Error ? err.message : 'errore sconosciuto'}.`,
        };
      }
    }

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
): Promise<{ success: boolean; message: string; results: { id: string; success: boolean; message: string }[] }> {
  const results: { id: string; success: boolean; message: string }[] = [];

  for (const id of ids) {
    const invoice = await getProjectInvoiceById(id);
    if (invoice?.ficInvoiceId) {
      results.push({ id, success: false, message: 'Già generata, saltata (usa la generazione singola per sovrascrivere).' });
      continue;
    }
    const res = await generateFicInvoiceAction(id);
    results.push({ id, success: res.success, message: res.message });
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;
  revalidatePath('/dashboard/invoices');
  return {
    success: successCount > 0,
    message: `${successCount} generat${successCount === 1 ? 'a' : 'e'} su FIC, ${failCount} fallit${failCount === 1 ? 'a' : 'e'}.`,
    results,
  };
}
```

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/actions/projectInvoices.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/projectInvoices.ts
git commit -m "Implementa generazione fattura su Fatture in Cloud (singola e bulk)"
```

---

### Task 4: UI generazione singola — `ProjectInvoiceRow.tsx` e `InvoicePreviewModal.tsx`

**Files:**
- Modify: `components/ProjectInvoiceRow.tsx`
- Modify: `components/InvoicePreviewModal.tsx`

**Interfaces:**
- Consumes: `generateFicInvoiceAction` (`@/lib/actions/projectInvoices`), `DoubleConfirmModal` (`@/components/DoubleConfirmModal`), `notify` (`@/lib/notify`).
- Produces: nessuna nuova interfaccia pubblica — solo comportamento UI.

- [ ] **Step 1: Abilitare e collegare il bottone in `ProjectInvoiceRow.tsx`**

Nel file attuale, il context-menu ha già:

```tsx
<button type="button" onClick={handleGenerateFic} className={MENU_ROW_CLASS}>
  <FileOutput size={15} strokeWidth={1.75} aria-hidden="true" />
  Genera su FIC
  <span className="ml-auto text-[10px] text-secondary">Presto</span>
</button>
```

e la funzione:

```typescript
async function handleGenerateFic() {
  const res = await generateFicInvoiceAction(invoice.id);
  notify(res.message);
}
```

Sostituire entrambe. Prima aggiungere lo stato per la conferma, subito dopo `const [previewOpen, setPreviewOpen] = useState(false);`:

```typescript
const [ficConfirmOpen, setFicConfirmOpen] = useState(false);
const [ficOverwriteWarning, setFicOverwriteWarning] = useState<string | null>(null);
```

Sostituire `handleGenerateFic` con:

```typescript
async function handleGenerateFic(confirmOverwrite?: boolean) {
  const res = await generateFicInvoiceAction(invoice.id, { confirmOverwrite });
  if (res.needsOverwriteConfirm) {
    setFicOverwriteWarning(res.message);
    setFicConfirmOpen(true);
    return;
  }
  notify(res.message);
  setFicConfirmOpen(false);
  setFicOverwriteWarning(null);
  if (res.success) router.refresh();
}
```

Sostituire il bottone del context-menu (rimuovendo `onClick={handleGenerateFic}` diretto e il badge "Presto") con:

```tsx
<button type="button" onClick={() => { setFicOverwriteWarning(null); setFicConfirmOpen(true); }} className={MENU_ROW_CLASS}>
  <FileOutput size={15} strokeWidth={1.75} aria-hidden="true" />
  Genera su FIC
</button>
```

Aggiungere, subito prima della chiusura `</RowContextMenu>` (accanto a dove è già renderizzato `{deleteOpen && (...)}`), il modale di conferma:

```tsx
{ficConfirmOpen && (
  <DoubleConfirmModal
    title="Genera fattura su Fatture in Cloud"
    firstMessage={
      ficOverwriteWarning
        ? `${ficOverwriteWarning} Generandone una nuova, il riferimento al documento precedente verrà sovrascritto in LNON (il vecchio documento resta comunque presente su FIC). Procedere?`
        : 'Verrà creata una fattura definitiva e numerata su Fatture in Cloud (non è possibile crearla come bozza). Procedere?'
    }
    secondMessage="Confermi in modo definitivo? L'operazione non è annullabile da LNON."
    confirmLabel="Genera su FIC"
    onConfirm={() => handleGenerateFic(!!ficOverwriteWarning)}
    onClose={() => { setFicConfirmOpen(false); setFicOverwriteWarning(null); }}
  />
)}
```

Nota: `handleGenerateFic` non è più chiamata da nessun bottone del componente `previewOpen`/`InvoicePreviewModal` in questo task — quello è il prossimo step.

- [ ] **Step 2: Verificare che `useRouter` sia già importato**

`ProjectInvoiceRow.tsx` importa già `useRouter` da `next/navigation` (usato in `handleDeleteConfirm`/`handleArchive`) — nessuna modifica agli import necessaria oltre a quanto già presente.

- [ ] **Step 3: Aggiungere il bottone "Genera su FIC" a `InvoicePreviewModal.tsx`**

`InvoicePreviewModal` oggi riceve `{ invoice, showAmounts, onClose }` e non ha logica di generazione FIC. Aggiungere una prop opzionale `onGenerateFic?: () => void` che il chiamante passa già collegata (per evitare di duplicare qui la logica di conferma/stato — la gestisce il chiamante).

Modificare la firma del componente da:

```typescript
export default function InvoicePreviewModal({ invoice, showAmounts, onClose }: { invoice: ProjectInvoice; showAmounts: boolean; onClose: () => void }) {
```

a:

```typescript
export default function InvoicePreviewModal({
  invoice,
  showAmounts,
  onClose,
  onGenerateFic,
}: {
  invoice: ProjectInvoice;
  showAmounts: boolean;
  onClose: () => void;
  onGenerateFic?: () => void;
}) {
```

Aggiungere l'import di `FileOutput` accanto a `X` in cima al file:

```typescript
import { X, FileOutput } from 'lucide-react';
```

Nel blocco header, subito dopo lo `<span>` del badge di stato (`<span className={...STATUS_BADGE[invoice.status]}...>`), aggiungere condizionalmente il bottone:

```tsx
{onGenerateFic && invoice.status === 'da_fatturare' && (
  <button
    type="button"
    onClick={onGenerateFic}
    title="Genera su Fatture in Cloud"
    className="mt-1 flex items-center gap-1 text-[10px] font-medium text-secondary transition hover:text-primary"
  >
    <FileOutput size={12} strokeWidth={1.75} aria-hidden="true" />
    Genera su FIC
  </button>
)}
```

- [ ] **Step 4: Collegare `onGenerateFic` dal chiamante in `ProjectInvoiceRow.tsx`**

Nel render `{previewOpen && <InvoicePreviewModal invoice={invoice} showAmounts={showAmounts} onClose={() => setPreviewOpen(false)} />}`, aggiungere la prop:

```tsx
{previewOpen && (
  <InvoicePreviewModal
    invoice={invoice}
    showAmounts={showAmounts}
    onClose={() => setPreviewOpen(false)}
    onGenerateFic={() => { setPreviewOpen(false); setFicOverwriteWarning(null); setFicConfirmOpen(true); }}
  />
)}
```

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/ProjectInvoiceRow.tsx` e `components/InvoicePreviewModal.tsx`.

- [ ] **Step 6: Test manuale rapido**

Run: `npm run dev` (con `LOCAL_AUTH_BYPASS=true` per sessione superadmin locale se già configurato nel progetto)
Verifica manuale: aprire `/dashboard/invoices`, aprire il context-menu di una fattura `da_fatturare`, cliccare "Genera su FIC", verificare che appaia il `DoubleConfirmModal` a due step con i messaggi corretti (senza ancora confermare se non si dispone di un account FIC di test collegato — la verifica end-to-end reale è nel Task 6).

- [ ] **Step 7: Commit**

```bash
git add components/ProjectInvoiceRow.tsx components/InvoicePreviewModal.tsx
git commit -m "Collega generazione fattura FIC alla riga e al modale anteprima fattura"
```

---

### Task 5: UI generazione bulk — `InvoicesBulkBar.tsx` e `app/dashboard/invoices/page.tsx`

**Files:**
- Modify: `components/InvoicesBulkBar.tsx`
- Modify: `app/dashboard/invoices/page.tsx`

**Interfaces:**
- Consumes: `generateFicInvoicesBulkAction` (`@/lib/actions/projectInvoices`), `useProjectInvoicesSelectionStore` (già esistente), `DoubleConfirmModal`.
- Produces: nuova prop `invoiceStatuses` su `InvoicesBulkBar` — `Record<string, { status: ProjectInvoiceStatus; ficInvoiceId?: number }>`.

- [ ] **Step 1: Passare lo stato delle fatture a `InvoicesBulkBar` da `app/dashboard/invoices/page.tsx`**

Nel file `app/dashboard/invoices/page.tsx`, dove oggi si costruisce (circa linea 85):

```typescript
const invoiceGroupKeys = Object.fromEntries(invoices.map((i) => [i.id, i.clientId ?? i.clientName]));
```

aggiungere subito dopo:

```typescript
const invoiceStatuses = Object.fromEntries(
  invoices.map((i) => [i.id, { status: i.status, ficInvoiceId: i.ficInvoiceId }])
);
```

E aggiornare l'uso del componente (circa linea 102) da:

```tsx
extraTopControls={canManage ? <InvoicesBulkBar invoiceGroupKeys={invoiceGroupKeys} /> : undefined}
```

a:

```tsx
extraTopControls={canManage ? <InvoicesBulkBar invoiceGroupKeys={invoiceGroupKeys} invoiceStatuses={invoiceStatuses} /> : undefined}
```

- [ ] **Step 2: Aggiungere il bottone bulk in `InvoicesBulkBar.tsx`**

Aggiornare gli import in cima al file da:

```typescript
import { Archive, Combine, Loader2 } from 'lucide-react';
import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';
import { archiveProjectInvoicesAction, mergeProjectInvoicesAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';
```

a:

```typescript
import { useState } from 'react';
import { Archive, Combine, FileOutput, Loader2 } from 'lucide-react';
import { useProjectInvoicesSelectionStore } from '@/lib/store/projectInvoicesSelectionStore';
import { archiveProjectInvoicesAction, mergeProjectInvoicesAction, generateFicInvoicesBulkAction } from '@/lib/actions/projectInvoices';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { notify } from '@/lib/notify';
import type { ProjectInvoiceStatus } from '@/lib/types';
```

Aggiornare la firma del componente da:

```typescript
export default function InvoicesBulkBar({ invoiceGroupKeys }: { invoiceGroupKeys: Record<string, string> }) {
```

a:

```typescript
export default function InvoicesBulkBar({
  invoiceGroupKeys,
  invoiceStatuses,
}: {
  invoiceGroupKeys: Record<string, string>;
  invoiceStatuses: Record<string, { status: ProjectInvoiceStatus; ficInvoiceId?: number }>;
}) {
```

Subito dopo `const router = useRouter();`, aggiungere:

```typescript
const [ficConfirmOpen, setFicConfirmOpen] = useState(false);
```

Dopo la riga `const canMerge = selected.length >= 2 && groupKeysInSelection.size === 1;`, aggiungere:

```typescript
const canGenerateFic =
  selected.length >= 1 &&
  selected.every((id) => invoiceStatuses[id]?.status === 'da_fatturare' && !invoiceStatuses[id]?.ficInvoiceId);
```

Dopo `handleMerge`, aggiungere:

```typescript
function handleGenerateFic() {
  startTransition(async () => {
    const res = await generateFicInvoicesBulkAction(selected);
    notify(res.message);
    if (res.success) {
      clear();
      router.refresh();
    }
    setFicConfirmOpen(false);
  });
}
```

Nel JSX, subito prima del bottone "Archivia selezionate" esistente, aggiungere:

```tsx
{canGenerateFic && (
  <button
    type="button"
    onClick={() => setFicConfirmOpen(true)}
    disabled={isPending}
    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
  >
    {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <FileOutput size={14} strokeWidth={1.75} aria-hidden="true" />}
    Genera su FIC ({selected.length})
  </button>
)}
```

E subito prima del tag di chiusura `</div>` finale del componente, aggiungere:

```tsx
{ficConfirmOpen && (
  <DoubleConfirmModal
    title="Genera fatture su Fatture in Cloud"
    firstMessage={`Verranno create ${selected.length} fatture definitive e numerate su Fatture in Cloud (non è possibile crearle come bozza). Procedere?`}
    secondMessage="Confermi in modo definitivo? L'operazione non è annullabile da LNON."
    confirmLabel="Genera su FIC"
    onConfirm={handleGenerateFic}
    onClose={() => setFicConfirmOpen(false)}
  />
)}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/InvoicesBulkBar.tsx` e `app/dashboard/invoices/page.tsx`.

- [ ] **Step 4: Test manuale rapido**

Run: `npm run dev`
Verifica manuale: su `/dashboard/invoices`, selezionare 2+ fatture `da_fatturare` senza `ficInvoiceId` → deve comparire il bottone "Genera su FIC (N)"; selezionare anche una fattura già `fatturata` → il bottone deve sparire.

- [ ] **Step 5: Commit**

```bash
git add components/InvoicesBulkBar.tsx app/dashboard/invoices/page.tsx
git commit -m "Aggiunge generazione fattura FIC in blocco alla barra di selezione"
```

---

### Task 6: Verifica end-to-end con account FIC connesso

**Files:** nessuna modifica di codice — solo verifica manuale.

- [ ] **Step 1: Build completa**

Run: `npx tsc --noEmit && npm run build`
Expected: nessun errore.

- [ ] **Step 2: Verifica generazione singola**

Con un account Fatture in Cloud reale (o sandbox) già collegato via OAuth (`/dashboard/settings/fic`), e un cliente LNON con dati sufficienti per la sync FIC:
1. Aprire `/dashboard/invoices`, individuare una fattura `da_fatturare`.
2. Cliccare "Genera su FIC" dal context-menu, confermare i due step.
3. Verificare che la richiesta abbia successo: la fattura in lista passa a `fatturata`, mostra numero/data aggiornati.
4. Aprire l'account Fatture in Cloud e verificare che il documento esista, con cliente, righe (una per line item) e IVA corrette.

- [ ] **Step 3: Verifica generazione bulk**

Selezionare 2+ fatture `da_fatturare` non ancora collegate, cliccare "Genera su FIC (N)", confermare. Verificare il messaggio di riepilogo (`N generate, M fallite`) e che ogni fattura riuscita risulti `fatturata` con `ficInvoiceId` popolato.

- [ ] **Step 4: Verifica rigenerazione con conferma di sovrascrittura**

Su una fattura già collegata (`ficInvoiceId` presente — nota: dopo Task 3 lo stato passa a `fatturata`, quindi per testare questo caso serve riportare manualmente una fattura di test a `da_fatturare` mantenendo `ficInvoiceId`, es. via query diretta sul DB di sviluppo), cliccare di nuovo "Genera su FIC": verificare che compaia il messaggio di avviso sovrascrittura invece della generazione diretta, e che confermando venga creato un nuovo documento FIC (quello vecchio resta orfano su FIC, comportamento atteso).

- [ ] **Step 5: Verifica errore aliquota IVA mancante**

Se disponibile un ambiente di test FIC senza una certa aliquota configurata, generare una fattura con quel `vatRate` e verificare il messaggio d'errore esplicito (nessun documento creato, nessun cambio di stato).

Al termine di questo task, se tutte le verifiche passano, procedere con **superpowers:finishing-a-development-branch**.
