# Conteggio Orario Web — Design (Fase 1)

Terzo pezzo del "Piano Economico Generale" (dopo Overview Lavori e Spese
Fisse): tracciamento del lavoro a conteggio orario per cliente, sotto
Contratti, con generazione automatica — ma rigorosamente isolata — di un
Job/Progetto/Task per contratto. Sostituisce la sezione "Conteggi Orari Web
(CL, SA, Critical, Coop)" del vecchio Excel di riferimento
(`_mat/10-riferimento-bilancio-progetti.xlsx`), aggiornata a mano.

Questo documento copre solo la **Fase 1** (fondamenta: modello dati, cascata,
CRUD, UI lista/dettaglio). Fatturazione (Fase 2), integrazione in Overview
Lavori (Fase 3) e stato-lifecycle FIC (backlog) sono roadmap separata, non in
scope qui — vedi `~/.claude/plans/allora-sotto-contratti-aggiungiamo-nifty-flute.md`
per il disegno completo di tutte le fasi.

## Decisioni chiave

1. Un `hourly_contract` per cliente genera **un solo** Job e **un solo**
   Project persistenti (non uno per lavorazione). Ogni lavorazione
   (sottovoce) genera un Task dentro quell'unico Project.
2. La cascata "completare un Task aggiorna la lavorazione economica" è
   **isolata strutturalmente via dato**: si verifica sempre che il Project
   del task abbia `system_source = 'hourly_contract'` prima di agire. Ogni
   Project/Task normale ha questo campo `null`, quindi la cascata è un no-op
   garantito per tutto il resto del gestionale.
3. Riaprire un task completato **riporta simmetricamente** la lavorazione ad
   "assegnata" (completare/riaprire sono entrambi gesti deliberati sul lato
   destro della card, distinti dal drag-and-drop sul lato sinistro — nessun
   rischio di cascata accidentale).
4. I Project/Task speciali sono **nascosti di default** dalle board
   Team/Personale, con un toggle dedicato nella toolbar di Task per
   mostrarli, badge rosso col conteggio delle lavorazioni assegnate non
   completate.
5. L'importo di una lavorazione è uno **snapshot** (`hours × tariffa al
   momento dell'inserimento`), congelato — non ricalcolato se la tariffa
   standard/cheap cambia in futuro.
6. Fatturazione fuori scope qui (Fase 2): questa fase non tocca
   `project_invoices` a parte le colonne additive che eviteranno un secondo
   ALTER in Fase 2 (vedi sotto).

## Modello dati

### Nuove tabelle

**`hourly_contracts`** — una riga per cliente:
- `id uuid pk default gen_random_uuid()`
- `client_id uuid not null references clients(id)`, indice unico parziale
  `(client_id) where deleted_at is null` (un solo contratto orario attivo
  per cliente)
- `rate_type text not null check (rate_type in ('standard','cheap','custom'))`
- `custom_hourly_rate numeric(10,2)` — obbligatorio solo se `rate_type='custom'`
  (`check (rate_type <> 'custom' or custom_hourly_rate is not null)`)
- `status text not null default 'in_corso' check (status in ('in_corso','non_in_corso'))`
- `job_id uuid references jobs(id)`, `project_id uuid references projects(id)`
- `created_by uuid not null references users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`
- RLS enable, nessuna policy (stesso pattern delle altre tabelle: accesso
  solo via `supabaseServer`)

Le tariffe standard (80€/h) e cheap (45€/h) **non** sono colonne per riga:
vivono come costante in `lib/hourlyBilling.ts`. Solo `custom` salva un
numero sulla riga.

**`hourly_work_entries`** — le lavorazioni/sottovoci:
- `id uuid pk default gen_random_uuid()`
- `hourly_contract_id uuid not null references hourly_contracts(id)`
- `project_task_id uuid references project_tasks(id)`
- `platform_reference text`
- `description text not null`
- `entry_date date not null`
- `hours numeric(4,2) not null check (hours > 0)`
- `status text not null default 'assegnata' check (status in ('assegnata','completata'))`
- `amount numeric(10,2) not null default 0`
- `invoice_id uuid references project_invoices(id)`, `invoiced_at timestamptz`
  (non usati in questa fase, colonne pronte per la Fase 2 — mai
  soft-deleted quando fatturata, resterà visibile sotto il contratto)
- `created_by uuid not null references users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`
- Indici: `(hourly_contract_id) where deleted_at is null`, `(invoice_id)`
- RLS enable, nessuna policy

### Modifiche a tabelle esistenti

- **`jobs`**: `+ is_system_generated boolean not null default false`,
  `+ system_source text` (valore `'hourly_contract'` per questa feature,
  pensato estendibile). Non riusare `contract_id` (punta al vecchio tipo
  Contract/Manutenzione, concetto diverso).
- **`projects`**: stessi due campi, stessa semantica. Necessari qui perché
  sia il gate della cascata sia il filtro board operano a livello di
  Project.
- **`project_invoices`**: `+ source_type text not null default 'project' check (source_type in ('project','hourly_contract'))`,
  `+ hourly_contract_id uuid references hourly_contracts(id)` (nullable).
  Aggiunte ora (in questa migrazione) per evitare un secondo ALTER in Fase
  2, ma **non utilizzate** da nessun codice di questa fase — puramente
  additive, nessun impatto sul comportamento esistente.

### Tipi TypeScript (`lib/types.ts`)

```typescript
export type HourlyRateType = 'standard' | 'cheap' | 'custom';
export type HourlyContractStatus = 'in_corso' | 'non_in_corso';
export type HourlyWorkEntryStatus = 'assegnata' | 'completata';

export interface HourlyContract {
  id: string;
  clientId: string;
  rateType: HourlyRateType;
  customHourlyRate?: number;
  status: HourlyContractStatus;
  jobId?: string;
  projectId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Popolati solo in lettura (lista/dettaglio)
  clientName?: string;
  effectiveHourlyRate?: number;
  entriesCount?: number;
  lastEntryDate?: Date;
  totalAmount?: number;
}

export interface HourlyWorkEntry {
  id: string;
  hourlyContractId: string;
  projectTaskId?: string;
  platformReference?: string;
  description: string;
  entryDate: Date;
  hours: number;
  status: HourlyWorkEntryStatus;
  amount: number;
  invoiceId?: string;
  invoicedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

`Job` e `Project` guadagnano `isSystemGenerated?: boolean` e
`systemSource?: 'hourly_contract'`. `ProjectInvoice` guadagna
`sourceType?: 'project' | 'hourly_contract'` e `hourlyContractId?: string`
(campi aggiunti al tipo ma non popolati/usati da alcun codice in questa
fase).

`lib/hourlyBilling.ts` (nuovo, helper puri, nessun accesso DB):

```typescript
export const HOURLY_RATES: Record<'standard' | 'cheap', number> = { standard: 80, cheap: 45 };

export function resolveHourlyRate(contract: Pick<HourlyContract, 'rateType' | 'customHourlyRate'>): number {
  if (contract.rateType === 'custom') return contract.customHourlyRate ?? 0;
  return HOURLY_RATES[contract.rateType];
}
```

## Cascata isolata

`lib/hourlyBillingCascade.ts` (nuovo file):

```typescript
export async function applyHourlyWorkEntryCascade(task: ProjectTask, newStatus: ProjectTaskStatus): Promise<void> {
  const { data: entry } = await supabaseServer
    .from('hourly_work_entries')
    .select('id, status, hourly_contract_id')
    .eq('project_task_id', task.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!entry) return; // task normale, nessuna entry collegata: no-op garantito

  const { data: project } = await supabaseServer
    .from('projects').select('id, system_source').eq('id', task.projectId).single();
  if (project?.system_source !== 'hourly_contract') return; // verifica aggiuntiva, cintura e bretelle

  const targetStatus: HourlyWorkEntryStatus = newStatus === 'completed' ? 'completata' : 'assegnata';
  if (entry.status === targetStatus) return; // idempotente

  await supabaseServer.from('hourly_work_entries').update({ status: targetStatus }).eq('id', entry.id);
}
```

**Punto di innesto**: `lib/actions/projectTasks.ts`, dentro
`updateProjectTaskStatusAction` (usata da Team board, Personale,
`ProjectDetailModal` — ogni punto da cui oggi si completa un task), una
riga dopo la chiamata esistente:

```typescript
const task = await updateProjectTaskStatus(taskId, status); // invariata, lib/db.ts
await applyHourlyWorkEntryCascade(task, status); // nuovo, no-op per ogni task normale
```

`lib/db.ts` → `updateProjectTaskStatus` **non viene toccata**: la funzione
condivisa resta identica, zero rischio di regressione. L'isolamento è
garantito dal fatto che ogni Project pre-esistente ha `system_source = null`
dalla migrazione (default), quindi il secondo gate blocca sempre
l'esecuzione per qualunque task normale.

## Creazione (percorso simmetrico alla cascata)

- `createHourlyContract(input, createdBy)` (`lib/db.ts`): inserisce la riga
  `hourly_contracts`, poi crea il Job speciale
  (`is_system_generated: true, system_source: 'hourly_contract', title: "Conteggio orario — <cliente>", status: 'in_progress', fiscal_year: anno corrente`),
  poi il Project speciale (stessi flag, `job_id` collegato, `created_by`),
  poi aggiorna `hourly_contracts.job_id/project_id`. Inserimenti
  sequenziali (nessun helper di transazione esiste oggi nel codebase —
  stesso stile già in uso altrove per creazioni multi-tabella).
- `createHourlyWorkEntry(input, createdBy)`: risolve la tariffa corrente
  (`resolveHourlyRate`), calcola `amount = hours * rate`, inserisce la entry
  (`status: 'assegnata'`), poi crea il Task nel Project speciale
  (`title: description, status: 'todo', created_by`), poi collega
  `project_task_id`.

## Funzioni `lib/db.ts`

- `getHourlyContracts(filters?: { q?: string; status?: HourlyContractStatus }): Promise<HourlyContract[]>` —
  join `clients(name)`, aggregati (`entriesCount`, `lastEntryDate`,
  `totalAmount`) calcolati con una seconda query su `hourly_work_entries`
  raggruppata per contratto, uniti in application code (stesso stile di
  `getContractsStats`).
- `getHourlyContractById(id): Promise<HourlyContract | null>`
- `createHourlyContract(input, createdBy): Promise<HourlyContract>` (vedi sopra)
- `updateHourlyContract(id, patch: Partial<Pick<HourlyContract,'rateType'|'customHourlyRate'|'status'>>): Promise<HourlyContract>`
- `softDeleteHourlyContract(id): Promise<void>`
- `getHourlyWorkEntries(hourlyContractId): Promise<HourlyWorkEntry[]>`
- `createHourlyWorkEntry(input, createdBy): Promise<HourlyWorkEntry>` (vedi sopra)
- `updateHourlyWorkEntry(id, patch: Partial<Pick<HourlyWorkEntry,'platformReference'|'description'|'entryDate'|'hours'>>): Promise<HourlyWorkEntry>` —
  lancia errore se `invoice_id` è valorizzato (non modificabile una volta
  fatturata — anche se la fatturazione non è ancora implementata, il guard
  è innocuo da aggiungere ora); se cambiano le ore, ricalcola `amount` con
  la tariffa corrente del contratto; se cambia `description`, aggiorna
  anche il titolo del `project_tasks` collegato.
- `softDeleteHourlyWorkEntry(id): Promise<void>` — cascata a
  `softDeleteProjectTask` esistente (riusata senza modifiche).

## `lib/actions/hourlyBilling.ts` (nuovo)

Wrapper sottili, gated da `hasPermission(role, 'hourly_billing', action)`,
stesso stile di `lib/actions/contracts.ts`:
`createHourlyContractAction`, `updateHourlyContractAction`,
`deleteHourlyContractAction`, `createHourlyWorkEntryAction`,
`updateHourlyWorkEntryAction`, `deleteHourlyWorkEntryAction`.

## Permessi

Nuova risorsa `hourly_billing` in `PERMISSION_MATRIX` (`lib/permissions.ts`),
stessa shape di `contracts`:

| Ruolo | Permessi |
|---|---|
| superadmin | `read`, `create`, `update`, `delete` |
| admin | `read`, `create`, `update` |
| dipendente | `read` |

`canDeleteResource`/`canViewAmounts` già generici, riusati senza modifiche.

## UI

- **`components/SectionTabs.tsx`** (nuovo, riusabile): tab bar reale
  (route-based, `Link`), sopra la lista Contratti. Props:
  `tabs: { key, label, href }[]`, `activeKey`. Usata in
  `app/dashboard/contracts/page.tsx` (tab "Manutenzioni" attiva, invariato
  il resto della pagina) e nella nuova pagina (tab "Conteggio Orario Web"
  attiva).
- **`app/dashboard/contracts/hourly/page.tsx`** (nuovo): lista, stessa
  struttura di `app/dashboard/contracts/page.tsx`. Nuovi componenti:
  `HourlyContractsStatsWidget` (analogo di `ContractsStatsWidget`),
  `HourlyContractRow` (cliente, tipo tariffa + €/h risolto, stato, conteggio
  sottovoci, data ultima lavorazione, importo totale), un pulsante
  "Nuovo contratto orario" + `HourlyContractForm` (client picker da
  `getAllClientNames` esistente, radio tipo tariffa + campo custom).
- **`app/dashboard/contracts/hourly/[id]/page.tsx`** (nuovo): dettaglio
  contratto + lista lavorazioni. Nuovi componenti: `HourlyWorkEntryList`,
  `HourlyWorkEntryForm` (riferimento piattaforma, descrizione, data, ore).
  Il checkbox di completamento di ogni lavorazione chiama la stessa
  `updateProjectTaskStatusAction` già usata dalle board (parità di
  comportamento garantita, e verifica dal vivo che il gate della cascata
  funzioni).
- **Toggle "mostra progetti speciali" in Task**: nuovo store zustand
  (stesso pattern di `lib/store/contractsFilterStore.ts`) + nuovo bottone
  in `components/TopBar.tsx` (condizionato su
  `pathname.startsWith('/dashboard/tasks')`, stesso stile dei toggle
  Contratti/Lavori già presenti). Le board (`getAllAssignedProjects`,
  `getProjectsByAssignee` in `lib/db.ts`) continuano a recuperare tutti i
  progetti; `TeamBoard`/`PersonalBoard` filtrano client-side i progetti con
  `isSystemGenerated` in base allo stato del toggle (default: nascosti).
  Badge rosso col conteggio delle lavorazioni assegnate-non-completate
  sull'icona toggle, `absolute` in alto a destra a cavallo del bordo
  (stessa classe `task-count-badge` già usata in `TeamBoard.tsx`/
  `PersonalBoard.tsx`).
- **Jobs list**: badge/tag sulle righe con `isSystemGenerated` (riuso stile
  badge di stato esistente in `components/JobRow.tsx`).

## Criterio di accettazione (verifica end-to-end)

Creare un contratto orario → Job/Project auto-generati → aggiungere una
lavorazione → Task auto-generato nel Project speciale → completarla (dalla
vista dedicata, che usa la stessa azione delle board) → la lavorazione
passa a "completata" → riaprirla → torna ad "assegnata" → **verificare che
nessun progetto/task normale pre-esistente sia stato toccato** (creare/
completare un task normale prima e dopo, confermare comportamento
identico).

## Fuori scope (rimandato)

- Fase 2: generazione fattura-bozza da lavorazioni completate (`getInvoiceableHourlyEntries`, `generateHourlyBillingInvoice`, UI di selezione multi-entry).
- Fase 3: integrazione in Overview Lavori (`getJobsForecast`), filtro "nascondi lavori generati" nella pagina Jobs.
- Backlog: stato lifecycle fattura FIC reale (bozza/inviata/modificata/cancellata), rigenerazione, creazione fattura reale su Fatture in Cloud.
