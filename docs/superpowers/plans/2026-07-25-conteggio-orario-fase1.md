# Conteggio Orario Web (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hourly-billing contract tracking under Contratti ("Conteggio Orario Web" tab), where each client's hourly contract auto-generates a persistent Job+Project, each logged work-entry auto-generates a Task inside that Project, and completing that Task cascades — strictly isolated to these system-generated entities only — to flip the work-entry's economic status.

**Architecture:** Same stack/conventions as Overview Lavori and Spese Fisse (`docs/superpowers/plans/2026-07-25-overview-lavori.md`, `docs/superpowers/plans/2026-07-25-spese-fisse.md`): Next.js App Router, Supabase via `lib/db.ts`, Server Actions in `lib/actions/*.ts`, permission gating via `lib/permissions.ts`. Two new tables (`hourly_contracts`, `hourly_work_entries`), two new marker columns on `jobs`/`projects` (`is_system_generated`, `system_source`), and a data-gated cascade hook wired into the *existing* `updateProjectTaskStatusAction` — not a new code path, so every current call site (Team board, Personal board, `ProjectDetailModal`) automatically exercises the (inert-for-them) gate.

**Tech Stack:** Next.js (App Router, Server Components/Actions), TypeScript, Supabase/Postgres, Tailwind CSS, Zod, lucide-react, zustand (for the new visibility toggle store).

## Global Constraints

- SQL migrations are plain `.sql` files under `_mat/` in the repo root (`/Users/housedadasnc/Webapp/LNON/_mat/`), run manually against Supabase SQL Editor. Follow the naming convention `YYYY-MM-DD-<topic>-migration.sql`, `gen_random_uuid()` for PKs, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` with no policies (app only ever accesses via `supabaseServer`, a service-role client).
- No automated test framework (`package.json` only has `dev`/`build`/`start`/`lint`). Verify every task with `npx tsc --noEmit` and `npm run build` (both zero errors). Don't introduce new ESLint errors in files you touch (pre-existing `no-explicit-any` errors in `lib/db.ts` are baseline noise).
- **Critical isolation requirement**: the cascade (Task completion → work-entry status flip) must be a documented no-op for every pre-existing Job/Project/Task. This is achieved by gating on data (`projects.system_source === 'hourly_contract'`), never by branching on which UI called the action. Every task in this plan that touches `lib/actions/projectTasks.ts` or `lib/db.ts`'s `updateProjectTaskStatus` must preserve this — do not special-case by call site.
- Currency formatting: `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` (see `components/JobsForecastStatsWidget.tsx`) for stat tiles; simple `€ ${value.toFixed(2)}` is used in row-level cells (see `components/ContractRow.tsx`, `components/JobRow.tsx`) — match whichever pattern the file you're editing already uses.
- New permission resource `hourly_billing` in `PERMISSION_MATRIX` (`lib/permissions.ts`): superadmin `['read','create','update','delete']`, admin `['read','create','update']`, dipendente `['read']` — exact same shape as `contracts`.
- Rates: `standard` = 80€/h, `cheap` = 45€/h are **code constants** (`lib/hourlyBilling.ts`), not DB rows. Only `custom` stores a numeric rate on the `hourly_contracts` row. A work entry's `amount` is a **frozen snapshot** (`hours × rate at creation time`) — never recomputed from a later rate change.
- Editing a work entry once `invoice_id` is set must be blocked (even though invoicing itself is Phase 2 — the guard is cheap to add now and prevents a Phase 2 regression).

---

### Task 1: Database migration — `hourly_contracts`, `hourly_work_entries`, marker columns

**Files:**
- Create: `/Users/housedadasnc/Webapp/LNON/_mat/2026-07-25-conteggio-orario-migration.sql`

**Interfaces:**
- Produces: tables `hourly_contracts`, `hourly_work_entries`; new columns `jobs.is_system_generated`, `jobs.system_source`, `projects.is_system_generated`, `projects.system_source`, `project_invoices.source_type`, `project_invoices.hourly_contract_id` (the last two are unused until Phase 2, added now to avoid a second ALTER). Later tasks depend on all of these existing.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migrazione: Conteggio Orario Web (Fase 1) — contratti a conteggio orario,
-- lavorazioni, marker di generazione automatica su jobs/projects
-- (vedi docs/superpowers/specs/2026-07-25-conteggio-orario-design.md)
-- Da eseguire manualmente su Supabase SQL Editor
-- Data: 2026-07-25

CREATE TABLE IF NOT EXISTS hourly_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('standard', 'cheap', 'custom')),
  custom_hourly_rate NUMERIC(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'in_corso' CHECK (status IN ('in_corso', 'non_in_corso')),
  job_id UUID REFERENCES jobs(id),
  project_id UUID REFERENCES projects(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT custom_rate_required CHECK (rate_type <> 'custom' OR custom_hourly_rate IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_contracts_client_active
  ON hourly_contracts (client_id) WHERE deleted_at IS NULL;

ALTER TABLE hourly_contracts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE hourly_contracts IS 'Contratti a conteggio orario per cliente. Un solo contratto attivo per cliente. Genera un Job+Project speciali (job_id/project_id).';

CREATE TABLE IF NOT EXISTS hourly_work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hourly_contract_id UUID NOT NULL REFERENCES hourly_contracts(id),
  project_task_id UUID REFERENCES project_tasks(id),
  platform_reference TEXT,
  description TEXT NOT NULL,
  entry_date DATE NOT NULL,
  hours NUMERIC(4,2) NOT NULL CHECK (hours > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'assegnata' CHECK (status IN ('assegnata', 'completata')),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoice_id UUID REFERENCES project_invoices(id),
  invoiced_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hourly_work_entries_contract
  ON hourly_work_entries (hourly_contract_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hourly_work_entries_invoice
  ON hourly_work_entries (invoice_id);
CREATE INDEX IF NOT EXISTS idx_hourly_work_entries_task
  ON hourly_work_entries (project_task_id);

ALTER TABLE hourly_work_entries ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE hourly_work_entries IS 'Lavorazioni orarie (sottovoci) di un contratto a conteggio orario. Ognuna genera un project_tasks collegato (project_task_id).';

-- Marker di generazione automatica, additivi e sicuri (default false/null per
-- ogni riga esistente, quindi la cascata isolata resta un no-op per tutto
-- ciò che già esiste)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_source TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS system_source TEXT;

COMMENT ON COLUMN jobs.system_source IS 'Se is_system_generated=true, cosa lo ha generato (es. ''hourly_contract''). NULL per i lavori normali.';
COMMENT ON COLUMN projects.system_source IS 'Se is_system_generated=true, cosa lo ha generato (es. ''hourly_contract''). NULL per i progetti normali.';

-- Colonne additive su project_invoices per la Fase 2 (fatturazione), non
-- usate da alcun codice in questa fase
ALTER TABLE project_invoices
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'project' CHECK (source_type IN ('project', 'hourly_contract')),
  ADD COLUMN IF NOT EXISTS hourly_contract_id UUID REFERENCES hourly_contracts(id);
```

- [ ] **Step 2: Run the migration manually against Supabase SQL Editor**

Paste the full contents of `_mat/2026-07-25-conteggio-orario-migration.sql` into the Supabase SQL Editor and run it.

- [ ] **Step 3: Verify with read queries**

```sql
-- Expect: both new tables listed
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('hourly_contracts', 'hourly_work_entries');

-- Expect: 0 rows (no jobs/projects affected yet)
SELECT count(*) FROM jobs WHERE is_system_generated = true;
SELECT count(*) FROM projects WHERE is_system_generated = true;
```

- [ ] **Step 4: Report readiness and wait for confirmation**

Tell the user the migration file is ready and ask them to confirm it has been run against Supabase before continuing to Task 2 (same handshake used for the previous two migrations this session).

---

### Task 2: Add TypeScript types and `hourly_billing` permission

**Files:**
- Modify: `lib/types.ts` (add after the `ProjectInvoice` interface, before `ProjectTaskStatus`)
- Modify: `lib/permissions.ts` (`PERMISSION_MATRIX`, all three roles)

**Interfaces:**
- Produces: `HourlyRateType`, `HourlyContractStatus`, `HourlyWorkEntryStatus`, `HourlyContract`, `HourlyWorkEntry` types; `Job`/`Project` gain `isSystemGenerated?`/`systemSource?`; `ProjectInvoice` gains `sourceType?`/`hourlyContractId?`. Consumed by every later task.

- [ ] **Step 1: Add new interfaces to `lib/types.ts`**

Insert right before `export type ProjectTaskStatus = 'todo' | 'in_progress' | 'completed';`:

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

- [ ] **Step 2: Add marker fields to `Job` and `Project`**

In the `Job` interface, add after `fiscalYear: number;`:

```typescript
  // Generazione automatica (es. da un contratto a conteggio orario)
  isSystemGenerated?: boolean;
  systemSource?: 'hourly_contract';
```

In the `Project` interface, add after `completedAt?: Date;`:

```typescript
  // Generazione automatica (es. da un contratto a conteggio orario)
  isSystemGenerated?: boolean;
  systemSource?: 'hourly_contract';
```

- [ ] **Step 3: Add fields to `ProjectInvoice` (unused until Phase 2, additive)**

In the `ProjectInvoice` interface, add after `deletedAt?: Date;`:

```typescript
  sourceType?: 'project' | 'hourly_contract';
  hourlyContractId?: string;
```

- [ ] **Step 4: Add `hourly_billing` to `PERMISSION_MATRIX` in `lib/permissions.ts`**

In the `superadmin` block, next to `reports`:

```typescript
    hourly_billing: ['read', 'create', 'update', 'delete'],
```

In the `admin` block:

```typescript
    hourly_billing: ['read', 'create', 'update'],
```

In the `dipendente` block:

```typescript
    hourly_billing: ['read'],
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/permissions.ts
git commit -m "$(cat <<'EOF'
Aggiunge tipi HourlyContract/HourlyWorkEntry e permesso hourly_billing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add `lib/hourlyBilling.ts` (rate resolver) and row mapping in `lib/db.ts`

**Files:**
- Create: `lib/hourlyBilling.ts`
- Modify: `lib/db.ts` (row mappers for `Job`, `Project` to include the new marker fields; new row mappers for `HourlyContract`/`HourlyWorkEntry`)

**Interfaces:**
- Consumes: `HourlyContract`, `HourlyWorkEntry` (Task 2).
- Produces: `resolveHourlyRate(contract)`, `hourlyContractRowToHourlyContract`, `hourlyContractToRow`, `hourlyWorkEntryRowToHourlyWorkEntry`, `hourlyWorkEntryToRow` (all consumed by Task 4).

- [ ] **Step 1: Create `lib/hourlyBilling.ts`**

```typescript
import type { HourlyContract } from '@/lib/types';

export const HOURLY_RATES: Record<'standard' | 'cheap', number> = { standard: 80, cheap: 45 };

export function resolveHourlyRate(contract: Pick<HourlyContract, 'rateType' | 'customHourlyRate'>): number {
  if (contract.rateType === 'custom') return contract.customHourlyRate ?? 0;
  return HOURLY_RATES[contract.rateType];
}
```

- [ ] **Step 2: Update `jobRowToJob` and `jobToRow` in `lib/db.ts` to carry the marker fields**

In `jobRowToJob` (the function mapping a `jobs` row to a `Job`), add:

```typescript
    isSystemGenerated: row.is_system_generated ?? false,
    systemSource: row.system_source ?? undefined,
```

In `jobToRow`, add:

```typescript
  if (data.isSystemGenerated !== undefined) row.is_system_generated = data.isSystemGenerated;
  if (data.systemSource !== undefined) row.system_source = data.systemSource;
```

- [ ] **Step 3: Update `projectRowToProject` and `projectToRow` the same way**

In `projectRowToProject`, add:

```typescript
    isSystemGenerated: row.is_system_generated ?? false,
    systemSource: row.system_source ?? undefined,
```

In `projectToRow`, add:

```typescript
  if (data.isSystemGenerated !== undefined) row.is_system_generated = data.isSystemGenerated;
  if (data.systemSource !== undefined) row.system_source = data.systemSource;
```

- [ ] **Step 4: Add `HourlyContract`/`HourlyWorkEntry` row mappers to `lib/db.ts`**

Add near the end of the file (before the final `export type { ... }` re-export line):

```typescript
function hourlyContractRowToHourlyContract(row: Record<string, any>): HourlyContract {
  return {
    id: row.id,
    clientId: row.client_id,
    rateType: row.rate_type,
    customHourlyRate: row.custom_hourly_rate != null ? Number(row.custom_hourly_rate) : undefined,
    status: row.status,
    jobId: row.job_id ?? undefined,
    projectId: row.project_id ?? undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    clientName: row.clients?.name ?? undefined,
  };
}

function hourlyContractToRow(data: Partial<Omit<HourlyContract, 'id' | 'createdAt' | 'updatedAt' | 'clientName' | 'effectiveHourlyRate' | 'entriesCount' | 'lastEntryDate' | 'totalAmount'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.clientId !== undefined) row.client_id = data.clientId;
  if (data.rateType !== undefined) row.rate_type = data.rateType;
  if (data.customHourlyRate !== undefined) row.custom_hourly_rate = data.customHourlyRate;
  if (data.status !== undefined) row.status = data.status;
  if (data.jobId !== undefined) row.job_id = data.jobId;
  if (data.projectId !== undefined) row.project_id = data.projectId;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}

function hourlyWorkEntryRowToHourlyWorkEntry(row: Record<string, any>): HourlyWorkEntry {
  return {
    id: row.id,
    hourlyContractId: row.hourly_contract_id,
    projectTaskId: row.project_task_id ?? undefined,
    platformReference: row.platform_reference ?? undefined,
    description: row.description,
    entryDate: new Date(row.entry_date),
    hours: Number(row.hours),
    status: row.status,
    amount: Number(row.amount ?? 0),
    invoiceId: row.invoice_id ?? undefined,
    invoicedAt: row.invoiced_at ? new Date(row.invoiced_at) : undefined,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

function hourlyWorkEntryToRow(data: Partial<Omit<HourlyWorkEntry, 'id' | 'createdAt' | 'updatedAt'>>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.hourlyContractId !== undefined) row.hourly_contract_id = data.hourlyContractId;
  if (data.projectTaskId !== undefined) row.project_task_id = data.projectTaskId;
  if (data.platformReference !== undefined) row.platform_reference = data.platformReference;
  if (data.description !== undefined) row.description = data.description;
  if (data.entryDate !== undefined) row.entry_date = data.entryDate.toISOString().slice(0, 10);
  if (data.hours !== undefined) row.hours = data.hours;
  if (data.status !== undefined) row.status = data.status;
  if (data.amount !== undefined) row.amount = data.amount;
  if (data.invoiceId !== undefined) row.invoice_id = data.invoiceId;
  if (data.invoicedAt !== undefined) row.invoiced_at = data.invoicedAt ? data.invoicedAt.toISOString() : null;
  if (data.createdBy !== undefined) row.created_by = data.createdBy;
  return row;
}
```

- [ ] **Step 5: Add the two new type imports to the top-of-file import block in `lib/db.ts`**

Add `HourlyContract` and `HourlyWorkEntry` to the `import type { ... } from './types';` block.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/hourlyBilling.ts lib/db.ts
git commit -m "$(cat <<'EOF'
Aggiunge resolver tariffa oraria e mapping righe HourlyContract/HourlyWorkEntry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add `lib/db.ts` CRUD for hourly contracts/entries with Job/Project/Task generation

**Files:**
- Modify: `lib/db.ts` (add new exported functions near the `HourlyContract`/`HourlyWorkEntry` mappers added in Task 3)

**Interfaces:**
- Consumes: `hourlyContractRowToHourlyContract`, `hourlyContractToRow`, `hourlyWorkEntryRowToHourlyWorkEntry`, `hourlyWorkEntryToRow` (Task 3); `resolveHourlyRate` (Task 3); existing `createDbJob`, `createDbProject`, `createProjectTask`, `softDeleteProjectTask`.
- Produces:
  ```typescript
  export async function getHourlyContracts(filters?: { q?: string; status?: HourlyContractStatus }): Promise<HourlyContract[]>
  export async function getHourlyContractById(id: string): Promise<HourlyContract | null>
  export async function createHourlyContract(input: { clientId: string; rateType: HourlyRateType; customHourlyRate?: number }, createdBy: string): Promise<HourlyContract>
  export async function updateHourlyContract(id: string, patch: Partial<Pick<HourlyContract, 'rateType' | 'customHourlyRate' | 'status'>>): Promise<HourlyContract>
  export async function softDeleteHourlyContract(id: string): Promise<void>
  export async function getHourlyWorkEntries(hourlyContractId: string): Promise<HourlyWorkEntry[]>
  export async function createHourlyWorkEntry(input: { hourlyContractId: string; platformReference?: string; description: string; entryDate: Date; hours: number }, createdBy: string): Promise<HourlyWorkEntry>
  export async function updateHourlyWorkEntry(id: string, patch: Partial<Pick<HourlyWorkEntry, 'platformReference' | 'description' | 'entryDate' | 'hours'>>): Promise<HourlyWorkEntry>
  export async function softDeleteHourlyWorkEntry(id: string): Promise<void>
  ```
  Consumed by Task 5 (Server Actions).

- [ ] **Step 1: Add contract CRUD functions**

```typescript
/**
 * Contratti a conteggio orario, con aggregati calcolati lato applicazione
 * (conteggio lavorazioni, ultima data, totale).
 */
export async function getHourlyContracts(filters?: { q?: string; status?: HourlyContractStatus }): Promise<HourlyContract[]> {
  let query = supabaseServer
    .from('hourly_contracts')
    .select('*, clients(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  let contracts = (data ?? []).map(hourlyContractRowToHourlyContract);

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    contracts = contracts.filter((c) => (c.clientName ?? '').toLowerCase().includes(q));
  }

  if (contracts.length > 0) {
    const { data: entryRows, error: entriesError } = await supabaseServer
      .from('hourly_work_entries')
      .select('hourly_contract_id, entry_date, amount')
      .in('hourly_contract_id', contracts.map((c) => c.id))
      .is('deleted_at', null);
    if (entriesError) throw entriesError;

    const aggByContract = new Map<string, { count: number; lastDate?: Date; total: number }>();
    for (const row of entryRows ?? []) {
      const agg = aggByContract.get(row.hourly_contract_id) ?? { count: 0, total: 0 };
      agg.count += 1;
      agg.total += Number(row.amount ?? 0);
      const entryDate = new Date(row.entry_date);
      if (!agg.lastDate || entryDate > agg.lastDate) agg.lastDate = entryDate;
      aggByContract.set(row.hourly_contract_id, agg);
    }

    contracts = contracts.map((c) => {
      const agg = aggByContract.get(c.id);
      return {
        ...c,
        effectiveHourlyRate: resolveHourlyRate(c),
        entriesCount: agg?.count ?? 0,
        lastEntryDate: agg?.lastDate,
        totalAmount: agg?.total ?? 0,
      };
    });
  }

  return contracts;
}

export async function getHourlyContractById(id: string): Promise<HourlyContract | null> {
  const { data, error } = await supabaseServer
    .from('hourly_contracts')
    .select('*, clients(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  const contract = hourlyContractRowToHourlyContract(data);
  return { ...contract, effectiveHourlyRate: resolveHourlyRate(contract) };
}

/**
 * Crea un contratto a conteggio orario e genera il Job+Project speciali
 * (is_system_generated=true, system_source='hourly_contract') che
 * accumuleranno un Task per ogni lavorazione futura.
 */
export async function createHourlyContract(
  input: { clientId: string; rateType: HourlyRateType; customHourlyRate?: number },
  createdBy: string
): Promise<HourlyContract> {
  const { data: clientRow, error: clientError } = await supabaseServer
    .from('clients').select('name').eq('id', input.clientId).single();
  if (clientError) throw clientError;

  const { data: contractRow, error: insertError } = await supabaseServer
    .from('hourly_contracts')
    .insert([hourlyContractToRow({ clientId: input.clientId, rateType: input.rateType, customHourlyRate: input.customHourlyRate, status: 'in_corso', createdBy })])
    .select()
    .single();
  if (insertError) throw insertError;

  const title = `Conteggio orario — ${clientRow.name}`;
  const job = await createDbJob({
    title,
    clientId: input.clientId,
    status: 'in_progress',
    currency: 'EUR',
    fiscalYear: new Date().getFullYear(),
    isSystemGenerated: true,
    systemSource: 'hourly_contract',
    createdBy,
  });

  const project = await createDbProject({
    title,
    jobId: job.id,
    isSystemGenerated: true,
    systemSource: 'hourly_contract',
    createdBy,
  });

  const { data: updatedRow, error: updateError } = await supabaseServer
    .from('hourly_contracts')
    .update({ job_id: job.id, project_id: project.id })
    .eq('id', contractRow.id)
    .select('*, clients(name)')
    .single();
  if (updateError) throw updateError;

  return hourlyContractRowToHourlyContract(updatedRow);
}

export async function updateHourlyContract(
  id: string,
  patch: Partial<Pick<HourlyContract, 'rateType' | 'customHourlyRate' | 'status'>>
): Promise<HourlyContract> {
  const { data, error } = await supabaseServer
    .from('hourly_contracts')
    .update(hourlyContractToRow(patch))
    .eq('id', id)
    .select('*, clients(name)')
    .single();
  if (error) throw error;
  return hourlyContractRowToHourlyContract(data);
}

export async function softDeleteHourlyContract(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from('hourly_contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Add work-entry CRUD functions**

```typescript
export async function getHourlyWorkEntries(hourlyContractId: string): Promise<HourlyWorkEntry[]> {
  const { data, error } = await supabaseServer
    .from('hourly_work_entries')
    .select('*')
    .eq('hourly_contract_id', hourlyContractId)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hourlyWorkEntryRowToHourlyWorkEntry);
}

/**
 * Crea una lavorazione e il Task collegato nel Project speciale del
 * contratto. L'importo è uno snapshot calcolato con la tariffa corrente.
 */
export async function createHourlyWorkEntry(
  input: { hourlyContractId: string; platformReference?: string; description: string; entryDate: Date; hours: number },
  createdBy: string
): Promise<HourlyWorkEntry> {
  const contract = await getHourlyContractById(input.hourlyContractId);
  if (!contract) throw new Error('Contratto a conteggio orario non trovato.');
  if (!contract.projectId) throw new Error('Il contratto non ha un progetto collegato.');

  const rate = resolveHourlyRate(contract);
  const amount = Math.round(input.hours * rate * 100) / 100;

  const { data: entryRow, error: insertError } = await supabaseServer
    .from('hourly_work_entries')
    .insert([
      hourlyWorkEntryToRow({
        hourlyContractId: input.hourlyContractId,
        platformReference: input.platformReference,
        description: input.description,
        entryDate: input.entryDate,
        hours: input.hours,
        status: 'assegnata',
        amount,
        createdBy,
      }),
    ])
    .select()
    .single();
  if (insertError) throw insertError;

  const task = await createProjectTask({ projectId: contract.projectId, title: input.description, createdBy });

  const { data: updatedRow, error: updateError } = await supabaseServer
    .from('hourly_work_entries')
    .update({ project_task_id: task.id })
    .eq('id', entryRow.id)
    .select()
    .single();
  if (updateError) throw updateError;

  return hourlyWorkEntryRowToHourlyWorkEntry(updatedRow);
}

export async function updateHourlyWorkEntry(
  id: string,
  patch: Partial<Pick<HourlyWorkEntry, 'platformReference' | 'description' | 'entryDate' | 'hours'>>
): Promise<HourlyWorkEntry> {
  const { data: existingRow, error: fetchError } = await supabaseServer
    .from('hourly_work_entries').select('*').eq('id', id).single();
  if (fetchError) throw fetchError;
  const existing = hourlyWorkEntryRowToHourlyWorkEntry(existingRow);
  if (existing.invoiceId) throw new Error('Questa lavorazione è già stata fatturata e non può essere modificata.');

  const row = hourlyWorkEntryToRow(patch);
  if (patch.hours !== undefined) {
    const contract = await getHourlyContractById(existing.hourlyContractId);
    if (contract) row.amount = Math.round(patch.hours * resolveHourlyRate(contract) * 100) / 100;
  }

  const { data, error } = await supabaseServer
    .from('hourly_work_entries').update(row).eq('id', id).select().single();
  if (error) throw error;

  if (patch.description !== undefined && existing.projectTaskId) {
    await updateProjectTaskTitle(existing.projectTaskId, patch.description);
  }

  return hourlyWorkEntryRowToHourlyWorkEntry(data);
}

export async function softDeleteHourlyWorkEntry(id: string): Promise<void> {
  const { data: row, error: fetchError } = await supabaseServer
    .from('hourly_work_entries').select('project_task_id').eq('id', id).single();
  if (fetchError) throw fetchError;

  const { error } = await supabaseServer
    .from('hourly_work_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  if (row?.project_task_id) {
    await softDeleteProjectTask(row.project_task_id);
  }
}
```

- [ ] **Step 3: Add the two new type imports (`HourlyRateType`, `HourlyContractStatus`) to the top-of-file import block**

Add `HourlyRateType` and `HourlyContractStatus` to the `import type { ... } from './types';` block (alongside `HourlyContract`/`HourlyWorkEntry` already added in Task 3).

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `createDbJob`/`createDbProject` already accept `isSystemGenerated`/`systemSource` without a cast, since Task 2 added those fields as optional on the base `Job`/`Project` interfaces their `Omit<...>` parameter types derive from.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts
git commit -m "$(cat <<'EOF'
Aggiunge CRUD lib/db.ts per contratti/lavorazioni a conteggio orario con generazione Job/Project/Task

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Isolated cascade — `applyHourlyWorkEntryCascade`, wired into `updateProjectTaskStatusAction`

**Files:**
- Create: `lib/hourlyBillingCascade.ts`
- Modify: `lib/actions/projectTasks.ts` (`updateProjectTaskStatusAction` only)

**Interfaces:**
- Consumes: `ProjectTask`, `ProjectTaskStatus`, `HourlyWorkEntryStatus` (existing/Task 2); `supabaseServer` (existing).
- Produces: `applyHourlyWorkEntryCascade(task: ProjectTask, newStatus: ProjectTaskStatus): Promise<void>`.

- [ ] **Step 1: Create `lib/hourlyBillingCascade.ts`**

```typescript
import { supabaseServer } from '@/lib/db';
import type { ProjectTask, ProjectTaskStatus, HourlyWorkEntryStatus } from '@/lib/types';

/**
 * Cascata isolata: se il task completato/riaperto corrisponde a una
 * lavorazione a conteggio orario (verificato via project_task_id E
 * conferma che il Project collegato sia system_source='hourly_contract'),
 * allinea lo stato della lavorazione. Per qualunque task normale (nessuna
 * hourly_work_entries collegata, oppure Project non system-generated) è
 * un no-op garantito — non tocca mai nulla al di fuori di questa feature.
 */
export async function applyHourlyWorkEntryCascade(task: ProjectTask, newStatus: ProjectTaskStatus): Promise<void> {
  const { data: entry } = await supabaseServer
    .from('hourly_work_entries')
    .select('id, status')
    .eq('project_task_id', task.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!entry) return;

  const { data: project } = await supabaseServer
    .from('projects')
    .select('id, system_source')
    .eq('id', task.projectId)
    .single();
  if (project?.system_source !== 'hourly_contract') return;

  const targetStatus: HourlyWorkEntryStatus = newStatus === 'completed' ? 'completata' : 'assegnata';
  if (entry.status === targetStatus) return;

  await supabaseServer.from('hourly_work_entries').update({ status: targetStatus }).eq('id', entry.id);
}
```

Note: this requires `supabaseServer` to be exported from `lib/db.ts`. Check with `grep -n "export const supabaseServer\|export { supabaseServer" lib/db.ts` — if it's not currently exported, add `export` to its declaration (it's the module-level Supabase client used throughout `lib/db.ts`).

- [ ] **Step 2: Wire the cascade into `updateProjectTaskStatusAction` in `lib/actions/projectTasks.ts`**

Change:

```typescript
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
```

to:

```typescript
export async function updateProjectTaskStatusAction(
  taskId: string,
  status: ProjectTaskStatus
): Promise<{ success: boolean; message: string; task?: ProjectTask }> {
  try {
    await requireCanManage();
    const task = await updateProjectTaskStatus(taskId, status);
    await applyHourlyWorkEntryCascade(task, status);
    revalidatePath('/dashboard/tasks');
    return { success: true, message: 'Stato aggiornato.', task };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nell\'aggiornamento dello stato.' };
  }
}
```

Add the import at the top of the file:

```typescript
import { applyHourlyWorkEntryCascade } from '@/lib/hourlyBillingCascade';
```

`lib/db.ts`'s `updateProjectTaskStatus` itself is **not modified** — this is the entire isolation guarantee for this task.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual regression check (critical acceptance criteria)**

Run `npm run dev` (uses `LOCAL_AUTH_BYPASS=true` superadmin session). Go to `/dashboard/tasks`, create a normal task on any existing normal project, mark it completed, then reopen it. Expected: works exactly as before (no errors, no unexpected side effects) — this confirms the cascade is a true no-op for normal tasks, since no `hourly_work_entries` row exists linking to it.

- [ ] **Step 5: Commit**

```bash
git add lib/hourlyBillingCascade.ts lib/actions/projectTasks.ts lib/db.ts
git commit -m "$(cat <<'EOF'
Aggiunge la cascata isolata task-completato -> lavorazione conteggio orario

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `lib/actions/hourlyBilling.ts` Server Actions

**Files:**
- Create: `lib/actions/hourlyBilling.ts`

**Interfaces:**
- Consumes: `createHourlyContract`, `updateHourlyContract`, `softDeleteHourlyContract`, `createHourlyWorkEntry`, `updateHourlyWorkEntry`, `softDeleteHourlyWorkEntry` (Task 4); `hasPermission`, `canDeleteResource` (existing).
- Produces:
  ```typescript
  export async function createHourlyContractAction(formData: FormData): Promise<{ success: boolean; message: string }>
  export async function updateHourlyContractAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }>
  export async function deleteHourlyContractAction(id: string): Promise<{ success: boolean; message: string }>
  export async function createHourlyWorkEntryAction(hourlyContractId: string, formData: FormData): Promise<{ success: boolean; message: string }>
  export async function updateHourlyWorkEntryAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }>
  export async function deleteHourlyWorkEntryAction(id: string): Promise<{ success: boolean; message: string }>
  ```
  Consumed by Task 7/8 UI components.

- [ ] **Step 1: Write the file**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createHourlyContract,
  updateHourlyContract,
  softDeleteHourlyContract,
  createHourlyWorkEntry,
  updateHourlyWorkEntry,
  softDeleteHourlyWorkEntry,
} from '@/lib/db';
import type { HourlyRateType } from '@/lib/types';

async function requireRole(resource: string, action: string): Promise<{ userId: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return { userId };
}

export async function createHourlyContractAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('hourly_billing', 'create');
    const clientId = String(formData.get('clientId') || '');
    const rateType = String(formData.get('rateType') || '') as HourlyRateType;
    const customHourlyRateRaw = formData.get('customHourlyRate');
    const customHourlyRate = customHourlyRateRaw ? Number(customHourlyRateRaw) : undefined;

    if (!clientId) return { success: false, message: 'Il cliente è obbligatorio.' };
    if (!['standard', 'cheap', 'custom'].includes(rateType)) return { success: false, message: 'Tipo tariffa non valido.' };
    if (rateType === 'custom' && (!customHourlyRate || customHourlyRate <= 0)) {
      return { success: false, message: 'Inserisci una tariffa oraria valida.' };
    }

    await createHourlyContract({ clientId, rateType, customHourlyRate }, userId);
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Contratto a conteggio orario creato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella creazione del contratto.' };
  }
}

export async function updateHourlyContractAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('hourly_billing', 'update');
    const rateType = String(formData.get('rateType') || '') as HourlyRateType;
    const customHourlyRateRaw = formData.get('customHourlyRate');
    const customHourlyRate = customHourlyRateRaw ? Number(customHourlyRateRaw) : undefined;
    const status = String(formData.get('status') || 'in_corso') as 'in_corso' | 'non_in_corso';

    if (rateType === 'custom' && (!customHourlyRate || customHourlyRate <= 0)) {
      return { success: false, message: 'Inserisci una tariffa oraria valida.' };
    }

    await updateHourlyContract(id, { rateType, customHourlyRate, status });
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Contratto aggiornato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento del contratto." };
  }
}

export async function deleteHourlyContractAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'hourly_billing')) {
    return { success: false, message: 'Solo un superadmin può eliminare un contratto a conteggio orario.' };
  }

  await softDeleteHourlyContract(id);
  revalidatePath('/dashboard/contracts/hourly');
  return { success: true, message: 'Contratto eliminato.' };
}

export async function createHourlyWorkEntryAction(hourlyContractId: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('hourly_billing', 'create');
    const platformReference = String(formData.get('platformReference') || '') || undefined;
    const description = String(formData.get('description') || '').trim();
    const entryDateRaw = String(formData.get('entryDate') || '');
    const hours = Number(formData.get('hours'));

    if (!description) return { success: false, message: 'La descrizione è obbligatoria.' };
    if (!entryDateRaw) return { success: false, message: 'La data è obbligatoria.' };
    if (!Number.isFinite(hours) || hours <= 0) return { success: false, message: 'Le ore devono essere un numero maggiore di zero.' };

    await createHourlyWorkEntry({ hourlyContractId, platformReference, description, entryDate: new Date(entryDateRaw), hours }, userId);
    revalidatePath(`/dashboard/contracts/hourly/${hourlyContractId}`);
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Lavorazione aggiunta.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiunta della lavorazione." };
  }
}

export async function updateHourlyWorkEntryAction(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole('hourly_billing', 'update');
    const platformReference = String(formData.get('platformReference') || '') || undefined;
    const description = String(formData.get('description') || '').trim();
    const entryDateRaw = String(formData.get('entryDate') || '');
    const hours = Number(formData.get('hours'));

    if (!description) return { success: false, message: 'La descrizione è obbligatoria.' };
    if (!Number.isFinite(hours) || hours <= 0) return { success: false, message: 'Le ore devono essere un numero maggiore di zero.' };

    await updateHourlyWorkEntry(id, { platformReference, description, entryDate: entryDateRaw ? new Date(entryDateRaw) : undefined, hours });
    revalidatePath('/dashboard/contracts/hourly');
    return { success: true, message: 'Lavorazione aggiornata.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento della lavorazione." };
  }
}

export async function deleteHourlyWorkEntryAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'hourly_billing')) {
    return { success: false, message: 'Solo un superadmin può eliminare una lavorazione.' };
  }

  await softDeleteHourlyWorkEntry(id);
  revalidatePath('/dashboard/contracts/hourly');
  return { success: true, message: 'Lavorazione eliminata.' };
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/hourlyBilling.ts
git commit -m "$(cat <<'EOF'
Aggiunge Server Actions per contratti/lavorazioni a conteggio orario

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `SectionTabs` component and Contratti tab bar

**Files:**
- Create: `components/SectionTabs.tsx`
- Modify: `app/dashboard/contracts/page.tsx` (add the tab bar, "Manutenzioni" active)

**Interfaces:**
- Produces: `<SectionTabs tabs={{key,label,href}[]} activeKey={string} />`. Consumed here and by Task 8's new page.

- [ ] **Step 1: Create `components/SectionTabs.tsx`**

```tsx
import Link from 'next/link';

export default function SectionTabs({
  tabs,
  activeKey,
}: {
  tabs: { key: string; label: string; href: string }[];
  activeKey: string;
}) {
  return (
    <div className="mx-6 mt-6 flex items-center gap-1 border-b border-grid-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab.key === activeKey
              ? 'border-accent text-primary'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

Check `grep -n "border-accent\|--color-accent" app/globals.css` first — if there's no `border-accent` utility/token defined, replace `border-accent` with an existing accent color class already used elsewhere for active states (e.g. check `btn-accent` in `app/globals.css` for the underlying color variable and use `border-[var(--color-accent)]` or equivalent, matching whatever token that class resolves to).

- [ ] **Step 2: Add the tab bar to `app/dashboard/contracts/page.tsx`**

Add the import:

```typescript
import SectionTabs from '@/components/SectionTabs';
```

Insert `<SectionTabs tabs={[{ key: 'manutenzioni', label: 'Manutenzioni', href: '/dashboard/contracts' }, { key: 'orario', label: 'Conteggio Orario Web', href: '/dashboard/contracts/hourly' }]} activeKey="manutenzioni" />` right after `{stats && <ContractsStatsWidget stats={stats} />}` and before `<ContractsFilterWidget />`.

- [ ] **Step 3: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/SectionTabs.tsx app/dashboard/contracts/page.tsx
git commit -m "$(cat <<'EOF'
Aggiunge SectionTabs e la tab Manutenzioni/Conteggio Orario su Contratti

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Hourly contracts list page (`/dashboard/contracts/hourly`)

**Files:**
- Create: `app/dashboard/contracts/hourly/page.tsx`
- Create: `components/HourlyContractRow.tsx`
- Create: `components/NewHourlyContractButton.tsx`
- Create: `components/HourlyContractForm.tsx`

**Interfaces:**
- Consumes: `getHourlyContracts` (Task 4), `getAllClientNames` (existing, `lib/db.ts`), `createHourlyContractAction`, `deleteHourlyContractAction` (Task 6), `hasPermission`/`canDeleteResource` (existing), `SectionTabs` (Task 7), `FormPageModal` (existing, see `components/NewContractButton.tsx` for the exact usage pattern).
- Produces: a reachable page at `/dashboard/contracts/hourly`.

- [ ] **Step 1: Create `components/HourlyContractForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { HourlyContract, HourlyRateType } from '@/lib/types';

const RATE_LABELS: Record<HourlyRateType, string> = {
  standard: 'Standard (80€/h)',
  cheap: 'Cheap (45€/h)',
  custom: 'Custom',
};

export default function HourlyContractForm({
  contract,
  clientOptions,
  action,
}: {
  contract?: HourlyContract;
  clientOptions: { id: string; name: string }[];
  action: (formData: FormData) => void;
}) {
  const [rateType, setRateType] = useState<HourlyRateType>(contract?.rateType ?? 'standard');

  return (
    <form action={action} className="space-y-4 p-8">
      {!contract && (
        <div className="field-wrap">
          <select
            name="clientId"
            id="clientId"
            required
            defaultValue=""
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
          >
            <option value="" disabled>
              Seleziona un cliente
            </option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="clientId" className="field-floating-label">
            Cliente *
          </label>
        </div>
      )}

      <div className="flex gap-4">
        {(['standard', 'cheap', 'custom'] as HourlyRateType[]).map((rt) => (
          <label key={rt} className="flex items-center gap-1.5 text-sm text-primary">
            <input type="radio" name="rateType" value={rt} checked={rateType === rt} onChange={() => setRateType(rt)} />
            {RATE_LABELS[rt]}
          </label>
        ))}
      </div>

      {rateType === 'custom' && (
        <div className="field-wrap">
          <input
            type="number"
            name="customHourlyRate"
            id="customHourlyRate"
            step="0.01"
            min={0}
            defaultValue={contract?.customHourlyRate}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="customHourlyRate" className="field-floating-label">
            Tariffa oraria custom (€/h) *
          </label>
        </div>
      )}

      {contract && (
        <div className="field-wrap">
          <select
            name="status"
            id="status"
            defaultValue={contract.status}
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
          >
            <option value="in_corso">In corso</option>
            <option value="non_in_corso">Non in corso</option>
          </select>
          <label htmlFor="status" className="field-floating-label">
            Stato
          </label>
        </div>
      )}

      <button type="submit" className="btn-accent rounded-lg px-4 py-2 text-sm font-medium">
        Salva
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `components/NewHourlyContractButton.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import HourlyContractForm from '@/components/HourlyContractForm';
import { createHourlyContractAction } from '@/lib/actions/hourlyBilling';

export default function NewHourlyContractButton({ clientOptions }: { clientOptions: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo contratto orario
      </button>
      {open && (
        <FormPageModal
          title="Nuovo contratto a conteggio orario"
          icon={<Clock size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <HourlyContractForm clientOptions={clientOptions} action={createHourlyContractAction} />
        </FormPageModal>
      )}
    </>
  );
}
```

Check `components/FormPageModal.tsx`'s actual props signature first (`grep -n "export default function FormPageModal" -A5 components/FormPageModal.tsx`) and adjust prop names if they differ from `title`/`icon`/`onClose`.

- [ ] **Step 3: Create `components/HourlyContractRow.tsx`**

```tsx
'use client';

import Link from 'next/link';
import type { HourlyContract, HourlyContractStatus } from '@/lib/types';

const STATUS_LABEL: Record<HourlyContractStatus, string> = {
  in_corso: 'In corso',
  non_in_corso: 'Non in corso',
};

const STATUS_BADGE: Record<HourlyContractStatus, string> = {
  in_corso: 'bg-green-600/10 text-green-700',
  non_in_corso: 'bg-grid-header-bg text-secondary',
};

function formatEuro(value?: number): string {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date): string {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default function HourlyContractRow({ contract }: { contract: HourlyContract }) {
  return (
    <Link
      href={`/dashboard/contracts/hourly/${contract.id}`}
      className="grid grid-cols-6 items-center gap-3 border-b border-grid-border px-4 py-3 text-sm text-primary transition hover:bg-row-hover"
    >
      <span>{contract.clientName ?? '—'}</span>
      <span className="capitalize">
        {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
      </span>
      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>
        {STATUS_LABEL[contract.status]}
      </span>
      <span>{contract.entriesCount ?? 0}</span>
      <span>{formatDate(contract.lastEntryDate)}</span>
      <span className="text-right font-medium">{formatEuro(contract.totalAmount)}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Create `app/dashboard/contracts/hourly/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContracts, getAllClientNames } from '@/lib/db';
import SectionTabs from '@/components/SectionTabs';
import HourlyContractRow from '@/components/HourlyContractRow';
import NewHourlyContractButton from '@/components/NewHourlyContractButton';

export const metadata = { title: 'Conteggio Orario Web' };

export default async function HourlyContractsPage() {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'hourly_billing', 'read')) {
    redirect('/dashboard');
  }

  const [contracts, clientOptions] = await Promise.all([getHourlyContracts(), getAllClientNames()]);
  const canCreate = hasPermission(role, 'hourly_billing', 'create');

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Contratti</h1>
        {canCreate && <NewHourlyContractButton clientOptions={clientOptions} />}
      </div>

      <SectionTabs
        tabs={[
          { key: 'manutenzioni', label: 'Manutenzioni', href: '/dashboard/contracts' },
          { key: 'orario', label: 'Conteggio Orario Web', href: '/dashboard/contracts/hourly' },
        ]}
        activeKey="orario"
      />

      <div className="p-6">
        <div className="grid grid-cols-6 gap-3 border-b border-grid-border px-4 py-2 text-xs font-medium text-secondary">
          <span>Cliente</span>
          <span>Tariffa</span>
          <span>Stato</span>
          <span>Lavorazioni</span>
          <span>Ultima lavorazione</span>
          <span className="text-right">Totale</span>
        </div>
        {contracts.map((c) => (
          <HourlyContractRow key={c.id} contract={c} />
        ))}
        {contracts.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-secondary">Nessun contratto a conteggio orario.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, with `/dashboard/contracts/hourly` listed among the built routes.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open `/dashboard/contracts`, click the "Conteggio Orario Web" tab, create a new hourly contract for any client with `standard` rate. Expected: row appears with "standard — € 80.00/h", status "In corso", 0 lavorazioni.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/contracts/hourly/page.tsx components/HourlyContractRow.tsx components/NewHourlyContractButton.tsx components/HourlyContractForm.tsx
git commit -m "$(cat <<'EOF'
Aggiunge la pagina lista Conteggio Orario Web sotto Contratti

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Hourly contract detail page — work entries list/form with task-completion reuse

**Files:**
- Create: `app/dashboard/contracts/hourly/[id]/page.tsx`
- Create: `components/HourlyWorkEntryRow.tsx`
- Create: `components/HourlyWorkEntryForm.tsx`
- Create: `components/NewHourlyWorkEntryButton.tsx`

**Interfaces:**
- Consumes: `getHourlyContractById`, `getHourlyWorkEntries` (Task 4); `createHourlyWorkEntryAction` (Task 6); `updateProjectTaskStatusAction` (existing, `lib/actions/projectTasks.ts` — now carrying the Task 5 cascade).
- Produces: a reachable page at `/dashboard/contracts/hourly/[id]`.

- [ ] **Step 1: Create `components/HourlyWorkEntryForm.tsx`**

```tsx
'use client';

export default function HourlyWorkEntryForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="space-y-4 p-8">
      <div className="field-wrap">
        <input
          type="text"
          name="platformReference"
          id="platformReference"
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="platformReference" className="field-floating-label">
          Riferimento piattaforma
        </label>
      </div>
      <div className="field-wrap">
        <input
          type="text"
          name="description"
          id="description"
          required
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="description" className="field-floating-label">
          Descrizione lavorazione *
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="field-wrap">
          <input
            type="date"
            name="entryDate"
            id="entryDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
          />
          <label htmlFor="entryDate" className="field-floating-label">
            Data *
          </label>
        </div>
        <div className="field-wrap">
          <input
            type="number"
            name="hours"
            id="hours"
            step="0.5"
            min="0.5"
            required
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="hours" className="field-floating-label">
            Ore *
          </label>
        </div>
      </div>
      <button type="submit" className="btn-accent rounded-lg px-4 py-2 text-sm font-medium">
        Aggiungi lavorazione
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `components/NewHourlyWorkEntryButton.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import HourlyWorkEntryForm from '@/components/HourlyWorkEntryForm';
import { createHourlyWorkEntryAction } from '@/lib/actions/hourlyBilling';

export default function NewHourlyWorkEntryButton({ hourlyContractId }: { hourlyContractId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuova lavorazione
      </button>
      {open && (
        <FormPageModal
          title="Nuova lavorazione"
          icon={<Clock size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <HourlyWorkEntryForm action={createHourlyWorkEntryAction.bind(null, hourlyContractId)} />
        </FormPageModal>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `components/HourlyWorkEntryRow.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectTaskStatusAction } from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import type { HourlyWorkEntry } from '@/lib/types';

function formatDate(value: Date): string {
  return value.toLocaleDateString('it-IT');
}

export default function HourlyWorkEntryRow({ entry }: { entry: HourlyWorkEntry }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const completed = entry.status === 'completata';

  function toggle() {
    if (!entry.projectTaskId) return;
    startTransition(async () => {
      const res = await updateProjectTaskStatusAction(entry.projectTaskId!, completed ? 'todo' : 'completed');
      if (!res.success) notify(res.message);
      else router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-6 items-center gap-3 border-b border-grid-border px-4 py-3 text-sm text-primary">
      <span>{entry.platformReference ?? '—'}</span>
      <span>{entry.description}</span>
      <span>{formatDate(entry.entryDate)}</span>
      <span>{entry.hours}</span>
      <span className="font-medium">€ {entry.amount.toFixed(2)}</span>
      <label className="flex items-center gap-1.5 text-xs text-secondary">
        <input type="checkbox" checked={completed} disabled={isPending || !entry.projectTaskId} onChange={toggle} className="cursor-pointer" />
        {completed ? 'Completata' : 'Assegnata'}
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/dashboard/contracts/hourly/[id]/page.tsx`**

```tsx
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getHourlyContractById, getHourlyWorkEntries } from '@/lib/db';
import HourlyWorkEntryRow from '@/components/HourlyWorkEntryRow';
import NewHourlyWorkEntryButton from '@/components/NewHourlyWorkEntryButton';

export const metadata = { title: 'Contratto a conteggio orario' };

export default async function HourlyContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'hourly_billing', 'read')) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const contract = await getHourlyContractById(id);
  if (!contract) notFound();

  const entries = await getHourlyWorkEntries(id);
  const canCreate = hasPermission(role, 'hourly_billing', 'create');

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{contract.clientName}</h1>
          <p className="text-sm text-secondary">
            {contract.rateType} — € {contract.effectiveHourlyRate?.toFixed(2)}/h
          </p>
        </div>
        {canCreate && <NewHourlyWorkEntryButton hourlyContractId={contract.id} />}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-6 gap-3 border-b border-grid-border px-4 py-2 text-xs font-medium text-secondary">
          <span>Riferimento</span>
          <span>Descrizione</span>
          <span>Data</span>
          <span>Ore</span>
          <span>Importo</span>
          <span>Stato</span>
        </div>
        {entries.map((e) => (
          <HourlyWorkEntryRow key={e.id} entry={e} />
        ))}
        {entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-secondary">Nessuna lavorazione registrata.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, with `/dashboard/contracts/hourly/[id]` listed among the built routes.

- [ ] **Step 6: Manual end-to-end verification (the plan's core acceptance criterion)**

Run `npm run dev`. Open the hourly contract created in Task 8, add a work entry (e.g. "Fix bug login", 2 hours). Expected: row appears with amount `€ 160.00` (2h × 80€/h standard rate), status "Assegnata". Click the checkbox to mark it completed. Expected: status flips to "Completata" after refresh. Uncheck it. Expected: status flips back to "Assegnata" (symmetric cascade). Then go to `/dashboard/tasks`, verify a normal (non-hourly) project's task can still be completed/reopened with no change in behavior — this confirms the isolation held throughout Tasks 8-9's real usage, not just Task 5's synthetic check.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/contracts/hourly/\[id\]/page.tsx components/HourlyWorkEntryRow.tsx components/HourlyWorkEntryForm.tsx components/NewHourlyWorkEntryButton.tsx
git commit -m "$(cat <<'EOF'
Aggiunge il dettaglio contratto orario con lavorazioni e completamento task riusato

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Hide special projects from Team/Personal boards, with a toggle + badge in the Task toolbar

**Files:**
- Create: `lib/store/specialProjectsVisibilityStore.ts`
- Create: `components/SpecialProjectsToggle.tsx`
- Modify: `app/dashboard/tasks/page.tsx` (compute open-entries count, pass to the toggle, filter projects passed to boards)
- Modify: `components/TeamBoard.tsx`, `components/PersonalBoard.tsx` (accept + apply an `isSystemGenerated` filter based on the store, client-side)

**Interfaces:**
- Consumes: `Project.isSystemGenerated` (Task 3); `getHourlyWorkEntries`/a new lightweight count function (Task 4-adjacent).
- Produces: a reachable toggle in the Task page toolbar hiding/showing special projects, default hidden, with a red count badge.

- [ ] **Step 1: Add `getOpenHourlyWorkEntriesCount` to `lib/db.ts`**

```typescript
/**
 * Conteggio delle lavorazioni assegnate (non completate) su tutti i
 * contratti a conteggio orario, per il badge del toggle "mostra progetti
 * speciali" nella toolbar di Task.
 */
export async function getOpenHourlyWorkEntriesCount(): Promise<number> {
  const { count, error } = await supabaseServer
    .from('hourly_work_entries')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'assegnata')
    .is('deleted_at', null);
  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 2: Create `lib/store/specialProjectsVisibilityStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpecialProjectsVisibilityState {
  visible: boolean;
  toggle: () => void;
}

export const useSpecialProjectsVisibilityStore = create<SpecialProjectsVisibilityState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-special-projects-visibility' }
  )
);
```

- [ ] **Step 3: Create `components/SpecialProjectsToggle.tsx`**

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import { useSpecialProjectsVisibilityStore } from '@/lib/store/specialProjectsVisibilityStore';

export default function SpecialProjectsToggle({ openCount }: { openCount: number }) {
  const visible = useSpecialProjectsVisibilityStore((s) => s.visible);
  const toggle = useSpecialProjectsVisibilityStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      title={visible ? 'Nascondi progetti speciali (conteggio orario)' : 'Mostra progetti speciali (conteggio orario)'}
      aria-pressed={visible}
      className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        visible ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
      {openCount > 0 && (
        <span className="task-count-badge absolute right-0 top-[-6px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {openCount}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Wire into `app/dashboard/tasks/page.tsx`**

Add the import: `import { getOpenHourlyWorkEntriesCount } from '@/lib/db';` and `import SpecialProjectsToggle from '@/components/SpecialProjectsToggle';`.

Fetch the count alongside the existing `Promise.all`/sequential fetches (add `getOpenHourlyWorkEntriesCount()` to whatever fetch grouping already exists), then render `<SpecialProjectsToggle openCount={openCount} />` in the toolbar div (`.task-toolbar-border`), next to the existing `<TaskBoardExpandToggle />`/`<TaskBoardViewToggle />`.

- [ ] **Step 5: Filter special projects out of `TeamBoard`/`PersonalBoard` client-side**

In `components/TeamBoard.tsx` and `components/PersonalBoard.tsx`, add:

```typescript
import { useSpecialProjectsVisibilityStore } from '@/lib/store/specialProjectsVisibilityStore';
```

and inside the component body, before rendering, filter the incoming `projectsByUser`/`realProjects` (whatever the exact prop name is in each file — verify with `grep -n "projectsByUser\|realProjects" components/TeamBoard.tsx components/PersonalBoard.tsx`):

```typescript
const specialVisible = useSpecialProjectsVisibilityStore((s) => s.visible);
// ...
const visibleProjects = specialVisible ? allProjects : allProjects.filter((p) => !p.isSystemGenerated);
```

Apply this filter at the point where projects are grouped/rendered per column, keeping the rest of each component's logic (drag-and-drop, column order, etc.) untouched — this is purely a display filter on an already-fetched list, not a new server round-trip.

- [ ] **Step 6: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open `/dashboard/tasks`. Expected: the special Project created in Task 8 (with its work-entry Task from Task 9) is **not** visible by default. Click the new toggle icon — expected: a red badge shows "1" (the open/assigned work entry from Task 9's verification, assuming it was left "assegnata"; if it was left "completata" in Task 9's test, the badge should show "0" and not render). Toggling reveals the special project/task in the board; toggling again hides it. Mark the work entry completed from this board view (not from the hourly UI) — verify (via the hourly contract detail page) that the entry's status flips to "completata" too, confirming the cascade fires from *this* entry point as well (both UI paths funnel through the same `updateProjectTaskStatusAction`).

- [ ] **Step 8: Commit**

```bash
git add lib/db.ts lib/store/specialProjectsVisibilityStore.ts components/SpecialProjectsToggle.tsx app/dashboard/tasks/page.tsx components/TeamBoard.tsx components/PersonalBoard.tsx
git commit -m "$(cat <<'EOF'
Nasconde i progetti speciali dalle board Team/Personale con toggle e badge dedicati

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Badge for system-generated jobs in the Jobs list

**Files:**
- Modify: `components/JobRow.tsx`

**Interfaces:**
- Consumes: `Job.isSystemGenerated` (Task 3).

- [ ] **Step 1: Add a small badge next to the job title in `components/JobRow.tsx`**

Find the cell rendering the job title (likely the `'title'` case in `renderCell`, or wherever `job.title` is first displayed) and add, conditionally:

```tsx
{job.isSystemGenerated && (
  <span className="ml-1.5 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
    Conteggio orario
  </span>
)}
```

Adjust placement/wrapper to fit the existing JSX structure around the title cell (check the exact surrounding markup first with `grep -n "'title'" -A5 components/JobRow.tsx`).

- [ ] **Step 2: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Open `/dashboard/jobs`, confirm the special Job from Task 8 shows the "Conteggio orario" badge next to its title, and no other job shows it.

- [ ] **Step 4: Commit**

```bash
git add components/JobRow.tsx
git commit -m "$(cat <<'EOF'
Aggiunge badge "Conteggio orario" ai lavori generati automaticamente

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-implementation note

This plan covers Phase 1 only (foundations: data model, cascade, CRUD, list/detail UI, board isolation). Phase 2 (draft invoice generation from completed work entries) and Phase 3 (Overview Lavori reporting integration) are separate follow-up plans, per the roadmap in `~/.claude/plans/allora-sotto-contratti-aggiungiamo-nifty-flute.md`. The FIC invoice-lifecycle backlog item is explicitly not started.
