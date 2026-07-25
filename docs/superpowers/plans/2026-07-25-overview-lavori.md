# Overview Lavori (previsionale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Reports sub-page that aggregates Jobs by fiscal year into Potenziale / Preventivato / Confermato / Fatturato / Spese Fornitori totals, and remove the `budgetShare` mechanism from Project (including its tied auto-invoice-on-complete behavior).

**Architecture:** Next.js App Router project (`lnon-app`) backed by Supabase (Postgres via `supabaseServer` client in `lib/db.ts`). Server Components fetch data directly from `lib/db.ts`; mutations go through Server Actions in `lib/actions/*.ts`. This feature adds two new columns to `jobs` (`fiscal_year`, `supplier_cost`), removes one column from `projects` (`budget_share`), adds a new read-only aggregation function in `lib/db.ts`, and a new page `app/dashboard/reports/lavori/page.tsx`. No new client-side state libraries are needed — the page is a plain async Server Component like `app/dashboard/contracts/page.tsx`.

**Tech Stack:** Next.js (App Router, Server Components/Actions), TypeScript, Supabase/Postgres, Tailwind CSS, Zod (form validation), lucide-react (icons).

## Global Constraints

- SQL migrations are plain `.sql` files under `_mat/` in the repo root (`/Users/housedadasnc/Webapp/LNON/_mat/`), run manually against Supabase SQL Editor — this project has no migration runner. Follow the existing file naming convention: `YYYY-MM-DD-<topic>-migration.sql`.
- No automated test framework exists (`package.json` only has `dev`/`build`/`start`/`lint`). Verification for every task is `npm run lint` and `npm run build` (both must pass with zero errors), plus manual DB checks for the migration task.
- Currency formatting in this codebase follows the pattern in `components/ContractsStatsWidget.tsx`: `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` for exact values, and a `K`-suffixed compact form for big numbers.
- Access to `reports` is already gated by `hasPermission(role, 'reports', 'read')` in `lib/permissions.ts` — `dipendente` has `reports: []` (no access), `admin`/`superadmin` have `read`. Follow the same gating pattern as `app/dashboard/contracts/page.tsx`.
- `Job.status` categories for this feature: `draft` → Potenziale, `pending_approval` → Preventivato, `approved`/`in_progress`/`completed` → Confermato, `cancelled` → excluded from all totals.
- Real invoiced amounts always come from `ProjectInvoice` rows (`lib/db.ts`, `project_invoices` table) filtered by `job_id` and `status = 'fatturata'`, summing `net_amount`. Never use the legacy singular `Job.invoiceNetAmount` field for new aggregation logic — it exists only for historic import residue.

---

### Task 1: Database migration — add `jobs.fiscal_year`, `jobs.supplier_cost`, drop `projects.budget_share`

**Files:**
- Create: `/Users/housedadasnc/Webapp/LNON/_mat/2026-07-25-overview-lavori-migration.sql`

**Interfaces:**
- Produces: DB columns `jobs.fiscal_year integer NOT NULL` (backfilled), `jobs.supplier_cost numeric NULL`. Removes DB column `projects.budget_share`. Later tasks (2, 3) depend on these columns existing/removed.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migrazione: Overview Lavori — anno di competenza e spese fornitori sui
-- lavori, rimozione della quota % budget sui progetti (vedi
-- docs/superpowers/specs/2026-07-25-overview-lavori-design.md).
-- Da eseguire manualmente su Supabase SQL Editor
-- Data: 2026-07-25

-- 1. Nuove colonne su jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_cost NUMERIC;

COMMENT ON COLUMN jobs.fiscal_year IS 'Anno di competenza economica del lavoro, selezionato manualmente. Usato per aggregare la Overview Lavori.';
COMMENT ON COLUMN jobs.supplier_cost IS 'Spesa fornitori/sottofornitori sostenuta per questo lavoro, importo singolo. Non popolato per lo storico (dati Excel storici inaffidabili).';

-- 2. Backfill: per i lavori esistenti senza anno esplicito, usa l'anno di
-- creazione come miglior default disponibile. Andrà corretto manualmente
-- dagli admin dove necessario tramite il form di modifica lavoro.
UPDATE jobs
SET fiscal_year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE fiscal_year IS NULL;

-- 3. Ora che tutti i lavori hanno un anno, rendi il campo obbligatorio
ALTER TABLE jobs
  ALTER COLUMN fiscal_year SET NOT NULL;

-- 4. Rimozione del meccanismo di quota % budget sui progetti (vedi design:
-- rimosso insieme alla generazione automatica di fattura al completamento)
ALTER TABLE projects
  DROP COLUMN IF EXISTS budget_share;
```

- [ ] **Step 2: Run the migration manually against Supabase SQL Editor**

Open the Supabase project's SQL Editor and paste the full contents of
`_mat/2026-07-25-overview-lavori-migration.sql`, then run it.

- [ ] **Step 3: Verify with read queries in the same SQL Editor**

```sql
-- Expect: 0 rows (no NULL fiscal_year left)
SELECT count(*) FROM jobs WHERE fiscal_year IS NULL;

-- Expect: column no longer listed
SELECT column_name FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'budget_share';

-- Expect: both columns present
SELECT column_name FROM information_schema.columns
WHERE table_name = 'jobs' AND column_name IN ('fiscal_year', 'supplier_cost');
```

- [ ] **Step 4: Commit the migration file**

```bash
cd /Users/housedadasnc/Webapp/LNON
git add _mat/2026-07-25-overview-lavori-migration.sql
git commit -m "$(cat <<'EOF'
Aggiunge migrazione per Overview Lavori: fiscal_year e supplier_cost su jobs, rimozione budget_share da projects

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update `Job`/`Project` types and `lib/db.ts` row mapping

**Files:**
- Modify: `lib/types.ts` (`Job` interface around line 153-188, `Project` interface around line 190-208)
- Modify: `lib/db.ts` (`jobRowToJob` ~line 304, `jobToRow` ~line 339, `projectRowToProject` ~line 1520, `projectToRow` ~line 1539)
- Modify: `lib/demoData.ts` (remove `budgetShare: 100` at line 66)

**Interfaces:**
- Consumes: nothing new (pure data-shape change).
- Produces: `Job.fiscalYear: number`, `Job.supplierCost?: number` fields available to every later task that reads/writes a `Job`. `Project` no longer has `budgetShare`.

- [ ] **Step 1: Add fields to `Job`, remove `budgetShare` from `Project` in `lib/types.ts`**

In the `Job` interface, add the two new fields right after `productIds?: string[];` (line 174):

```typescript
  productIds?: string[];
  // Anno di competenza economica del lavoro, per la Overview Lavori
  fiscalYear: number;
  // Spesa fornitori/sottofornitori sostenuta per questo lavoro (importo singolo)
  supplierCost?: number;
```

In the `Project` interface, delete this line:

```typescript
  budgetShare: number;
```

- [ ] **Step 2: Update `jobRowToJob` and `jobToRow` in `lib/db.ts`**

In `jobRowToJob` (around line 304), add after the `approvedBy` line:

```typescript
    fiscalYear: row.fiscal_year,
    supplierCost: row.supplier_cost != null ? Number(row.supplier_cost) : undefined,
```

In `jobToRow` (around line 339), add after the `if (data.assignedTo !== undefined) ...` line:

```typescript
  if (data.fiscalYear !== undefined) row.fiscal_year = data.fiscalYear;
  if (data.supplierCost !== undefined) row.supplier_cost = data.supplierCost;
```

- [ ] **Step 3: Remove `budgetShare` mapping from `projectRowToProject` and `projectToRow` in `lib/db.ts`**

In `projectRowToProject` (around line 1520), delete this line:

```typescript
    budgetShare: row.budget_share != null ? Number(row.budget_share) : 100,
```

In `projectToRow` (around line 1539), delete this line:

```typescript
  if (data.budgetShare !== undefined) row.budget_share = data.budgetShare;
```

- [ ] **Step 4: Remove `rebalanceProjectShares` from `lib/db.ts`**

Delete the entire function (around lines 1647-1678, from the doc comment
`/** * Assegna una nuova quota % ... */` through the closing `}` of
`rebalanceProjectShares`).

- [ ] **Step 5: Remove `budgetShare: 100` from `lib/demoData.ts`**

Delete the line `budgetShare: 100,` at line 66.

- [ ] **Step 6: Run the linter and build to check for now-broken references**

Run: `npm run lint && npm run build`
Expected: FAIL — TypeScript errors in `lib/actions/projects.ts`,
`lib/actions/projectInvoices.ts`, and the four components that still
reference `budgetShare`/`rebalanceProjectShares`. This is expected; those
are fixed in Tasks 3 and 4. Confirm the errors are *only* about
`budgetShare`/`rebalanceProjectShares`/`fiscalYear` (missing on some
`createDbJob`/`createDbProject` call), not something unrelated.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/db.ts lib/demoData.ts
git commit -m "$(cat <<'EOF'
Aggiunge fiscalYear/supplierCost a Job, rimuove budgetShare da Project

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Remove `budgetShare`-driven auto-invoice and UI (Server Actions + components)

**Files:**
- Modify: `lib/actions/projects.ts` (`createProjectAction`, `createProjectFromJobAction`; delete `updateProjectShareAction`)
- Modify: `lib/actions/projectInvoices.ts` (`markProjectCompletedAction`)
- Modify: `lib/db.ts` (`markProjectCompleted`, around line 1714)
- Delete: `components/ProjectShareBadge.tsx`
- Modify: `components/MarkProjectCompletedButton.tsx`
- Modify: `components/CreateProjectFromJobModal.tsx`
- Modify: `components/TeamBoard.tsx` (~lines 23-24, 335, 343)
- Modify: `components/TeamMemberDetailModal.tsx` (~lines 7-8, 80, 82)
- Modify: `components/PersonalBoard.tsx` (~lines 22-23, 313, 321)
- Modify: `components/ProjectDetailModal.tsx` (~lines 8-9, 57, 59)

**Interfaces:**
- Consumes: `Project` type from Task 2 (no `budgetShare`).
- Produces: `MarkProjectCompletedButton` now takes only `{ projectId, projectTitle }` (no `budgetShare` prop) — every caller must be updated to match.

- [ ] **Step 1: Simplify `markProjectCompleted` in `lib/db.ts` to no longer create an invoice**

Replace the whole function (currently ~line 1714-1748) with:

```typescript
/**
 * Segna un progetto come completato. Non genera più fatture automatiche:
 * la fatturazione va sempre creata manualmente dagli admin nella pagina Fatture.
 */
export async function markProjectCompleted(projectId: string): Promise<void> {
  const { error } = await supabaseServer
    .from('projects')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw error;
}
```

- [ ] **Step 2: Rewrite `markProjectCompletedAction` in `lib/actions/projectInvoices.ts`**

Replace the whole function (currently lines 28-64) with:

```typescript
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
```

Update the import list at the top of the file: remove `getJobById`,
`getClientById` (no longer used by this function — check the rest of the
file first; if another function in this file still uses them, keep the
import), and keep `getProjectById`, `markProjectCompleted`. Remove the
now-unused `ProjectInvoice` type import if nothing else in the file uses
it (check before removing).

- [ ] **Step 3: Remove `budgetShare` logic from `lib/actions/projects.ts`**

In `createProjectAction`, delete the line `budgetShare: 100,` from the
`createDbProject` call.

Replace `createProjectFromJobAction` (currently lines 68-106) with:

```typescript
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
```

Delete `updateProjectShareAction` entirely (currently lines 108-125).
Remove `getProjectsByJobId` and `rebalanceProjectShares` from the
`lib/db` import list at the top of the file (no longer used anywhere in
this file — verify with a search before removing).

- [ ] **Step 4: Delete `components/ProjectShareBadge.tsx`**

```bash
rm components/ProjectShareBadge.tsx
```

- [ ] **Step 5: Simplify `components/MarkProjectCompletedButton.tsx`**

Replace the whole file:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { markProjectCompletedAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';

export default function MarkProjectCompletedButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await markProjectCompletedAction(projectId);
      notify(res.message);
      setOpen(false);
      if (res.success) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        disabled={isPending}
        aria-label="Segna progetto come completato"
        title="Segna progetto come completato"
        className="special-action-btn flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-500/10 transition hover:bg-neutral-500/20"
      >
        <CheckCircle2 size={12} strokeWidth={2} className="special-action-icon" aria-hidden="true" />
      </button>
      {open && (
        <DoubleConfirmModal
          firstMessage={`Segnare il progetto "${projectTitle}" come completato?`}
          secondMessage="Il completamento non genera più fatture automatiche: potrai creare la fattura manualmente dalla pagina Fatture, se necessario. Confermi?"
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6: Remove the `budgetShare` field from `components/CreateProjectFromJobModal.tsx`**

Delete this whole block (lines 82-96):

```tsx
          <div className="field-wrap mt-6">
            <input
              type="number"
              name="budgetShare"
              id="project-budget-share"
              min={0}
              max={100}
              step="0.01"
              placeholder=" "
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
            />
            <label htmlFor="project-budget-share" className="field-floating-label">
              Quota % budget (lascia vuoto per la ripartizione automatica)
            </label>
          </div>
```

- [ ] **Step 7: Update `components/TeamBoard.tsx`, `components/TeamMemberDetailModal.tsx`, `components/PersonalBoard.tsx`, `components/ProjectDetailModal.tsx`**

In each of the four files:
1. Remove the line `import ProjectShareBadge from '@/components/ProjectShareBadge';`
2. Remove the `<ProjectShareBadge ... />` usage line entirely (in
   `TeamBoard.tsx` and `PersonalBoard.tsx` it's unconditional; in
   `TeamMemberDetailModal.tsx` and `ProjectDetailModal.tsx` it's wrapped
   in `{project.jobId && ...}` — remove the whole expression).
3. On the `<MarkProjectCompletedButton ... />` line, remove the
   `budgetShare={project.budgetShare}` prop, keeping `projectId` and
   `projectTitle`.

For example in `components/TeamBoard.tsx`, line 335 is deleted entirely,
and line 343 changes from:

```tsx
<MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} budgetShare={project.budgetShare} />
```

to:

```tsx
<MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} />
```

Apply the equivalent edit in the other three files.

- [ ] **Step 8: Run the linter and build**

Run: `npm run lint && npm run build`
Expected: PASS — no more errors about `budgetShare`,
`rebalanceProjectShares`, or `ProjectShareBadge`. (There may still be a
`fiscalYear` error from `createDbJob` calls — that's addressed in Task 4.)

- [ ] **Step 9: Commit**

```bash
git add lib/actions/projects.ts lib/actions/projectInvoices.ts lib/db.ts \
  components/MarkProjectCompletedButton.tsx components/CreateProjectFromJobModal.tsx \
  components/TeamBoard.tsx components/TeamMemberDetailModal.tsx \
  components/PersonalBoard.tsx components/ProjectDetailModal.tsx
git rm components/ProjectShareBadge.tsx 2>/dev/null || true
git commit -m "$(cat <<'EOF'
Rimuove il meccanismo budgetShare e la fattura automatica al completamento progetto

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add `fiscalYear`/`supplierCost` to the Job form and Server Action

**Files:**
- Modify: `lib/actions/jobs.ts` (`JobSchema`, `parseJobFormData`)
- Modify: `components/JobForm.tsx`

**Interfaces:**
- Consumes: `Job.fiscalYear: number`, `Job.supplierCost?: number` from Task 2.
- Produces: form submits `fiscalYear` (required, coerced to number) and
  `supplierCost` (optional number) fields that `createJobAction`/
  `updateJobAction` persist via `createDbJob`/`updateDbJob`.

- [ ] **Step 1: Extend `JobSchema` and `parseJobFormData` in `lib/actions/jobs.ts`**

In `JobSchema`, add after `estimatedBudget`/`actualBudget`:

```typescript
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  supplierCost: z.coerce.number().optional().or(z.literal('')),
```

`parseJobFormData` already generically coerces every non-`''` field
through the existing loop, so no further change is needed there — the
default branch (`cleaned[key] = value`) applies fine to
`fiscalYear`/`supplierCost` since they're not date strings.

- [ ] **Step 2: Add the "Anno di competenza" and "Spese fornitori" fields to `components/JobForm.tsx`**

In the "Budget e date" section (around line 165-174), change the grid
from 4 to 5 columns and add the two new fields. Replace:

```tsx
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Budget e date</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Budget stimato" name="estimatedBudget" defaultValue={job?.estimatedBudget} type="number" icon={Euro} />
          <Field label="Budget reale" name="actualBudget" defaultValue={job?.actualBudget} type="number" icon={Euro} />
          <Field label="Data inizio" name="startDate" defaultValue={toDateInputValue(job?.startDate)} type="date" icon={Calendar} />
          <Field label="Data fine" name="endDate" defaultValue={toDateInputValue(job?.endDate)} type="date" icon={Calendar} />
        </div>
        <input type="hidden" name="currency" value={job?.currency ?? 'EUR'} />
      </section>
```

with:

```tsx
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Budget e date</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Budget stimato" name="estimatedBudget" defaultValue={job?.estimatedBudget} type="number" icon={Euro} />
          <Field label="Budget reale" name="actualBudget" defaultValue={job?.actualBudget} type="number" icon={Euro} />
          <Field label="Spese fornitori" name="supplierCost" defaultValue={job?.supplierCost} type="number" icon={Euro} />
          <Field label="Data inizio" name="startDate" defaultValue={toDateInputValue(job?.startDate)} type="date" icon={Calendar} />
          <Field label="Data fine" name="endDate" defaultValue={toDateInputValue(job?.endDate)} type="date" icon={Calendar} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field
            label="Anno di competenza *"
            name="fiscalYear"
            defaultValue={job?.fiscalYear ?? new Date().getFullYear()}
            type="number"
          />
        </div>
        <input type="hidden" name="currency" value={job?.currency ?? 'EUR'} />
      </section>
```

- [ ] **Step 3: Run the linter and build**

Run: `npm run lint && npm run build`
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Manually verify the form in the running app**

Run: `npm run dev`, sign in as an admin, open `/dashboard/jobs/new`.
Expected: "Anno di competenza" defaults to the current year and
"Spese fornitori" is an empty numeric field next to "Budget reale".
Submit the form and confirm the job is created without errors, then edit
it and confirm both values are prefilled correctly.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/jobs.ts components/JobForm.tsx
git commit -m "$(cat <<'EOF'
Aggiunge anno di competenza e spese fornitori al form Lavoro

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add `getJobsForecast` aggregation function to `lib/db.ts`

**Files:**
- Modify: `lib/db.ts` (add new exported function + type, near `getJobs`, after line 459)

**Interfaces:**
- Consumes: `jobRowToJob` (Task 2), `project_invoices` table (existing).
- Produces:
  ```typescript
  export type JobForecastCategory = 'potenziale' | 'preventivato' | 'confermato';

  export interface JobForecastRow {
    jobId: string;
    clientName: string;
    title: string;
    status: JobStatus;
    category: JobForecastCategory;
    estimatedBudget: number;
    supplierCost: number;
    invoicedAmount: number;
    margin: number;
  }

  export interface JobsForecastResult {
    rows: JobForecastRow[];
    totals: {
      potenziale: number;
      preventivato: number;
      confermato: number;
      fatturato: number;
      speseFornitori: number;
    };
  }

  export async function getJobsForecast(fiscalYear: number): Promise<JobsForecastResult>
  ```
  Later task (6) consumes this function and these exact type names.

- [ ] **Step 1: Add the category mapping and the function**

Insert this after the `getJobs` function (after line 459, before
`getJobById`):

```typescript
const JOB_FORECAST_CATEGORY: Partial<Record<JobStatus, JobForecastCategory>> = {
  draft: 'potenziale',
  pending_approval: 'preventivato',
  approved: 'confermato',
  in_progress: 'confermato',
  completed: 'confermato',
  // cancelled: intenzionalmente assente, escluso da tutti i totali
};

export type JobForecastCategory = 'potenziale' | 'preventivato' | 'confermato';

export interface JobForecastRow {
  jobId: string;
  clientName: string;
  title: string;
  status: JobStatus;
  category: JobForecastCategory;
  estimatedBudget: number;
  supplierCost: number;
  invoicedAmount: number;
  margin: number;
}

export interface JobsForecastResult {
  rows: JobForecastRow[];
  totals: {
    potenziale: number;
    preventivato: number;
    confermato: number;
    fatturato: number;
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
    .select('*, clients(name)')
    .eq('fiscal_year', fiscalYear)
    .is('deleted_at', null)
    .neq('status', 'cancelled');
  if (jobsError) throw jobsError;

  const jobs = (jobRows ?? []).map(jobRowToJob);
  const jobIds = jobs.map((j) => j.id);

  let invoicedByJobId = new Map<string, number>();
  if (jobIds.length > 0) {
    const { data: invoiceRows, error: invoicesError } = await supabaseServer
      .from('project_invoices')
      .select('job_id, net_amount')
      .in('job_id', jobIds)
      .eq('status', 'fatturata');
    if (invoicesError) throw invoicesError;

    invoicedByJobId = (invoiceRows ?? []).reduce((map, row: any) => {
      if (!row.job_id) return map;
      map.set(row.job_id, (map.get(row.job_id) ?? 0) + Number(row.net_amount ?? 0));
      return map;
    }, new Map<string, number>());
  }

  const totals = { potenziale: 0, preventivato: 0, confermato: 0, fatturato: 0, speseFornitori: 0 };
  const rows: JobForecastRow[] = [];

  for (const job of jobs) {
    const category = JOB_FORECAST_CATEGORY[job.status];
    if (!category) continue; // cancelled o stato non mappato

    const estimatedBudget = job.estimatedBudget ?? 0;
    const supplierCost = job.supplierCost ?? 0;
    const invoicedAmount = invoicedByJobId.get(job.id) ?? 0;

    totals[category] += estimatedBudget;
    totals.fatturato += invoicedAmount;
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

- [ ] **Step 2: Run the linter and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Manually verify against real data via a scratch script**

Run (adjust the year to one that has imported historic jobs, e.g. 2026):

```bash
node -e "
const { getJobsForecast } = require('./lib/db.ts');
" 2>&1 | head -5
```

This will fail directly since `lib/db.ts` is TypeScript ESM — instead,
verify by temporarily calling `getJobsForecast(2026)` from the new page
in Task 6 and inspecting the rendered totals, cross-checking a couple of
`estimatedBudget`/fatturato numbers against the Supabase table editor for
a known job. Do this check as part of Task 6 Step 4 rather than in
isolation here.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "$(cat <<'EOF'
Aggiunge getJobsForecast per l'aggregazione annuale dei lavori

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Build the Overview Lavori page

**Files:**
- Create: `components/JobsForecastStatsWidget.tsx`
- Create: `app/dashboard/reports/lavori/page.tsx`
- Modify: `app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `getJobsForecast`, `JobsForecastResult`, `JobForecastRow`,
  `JobForecastCategory` (Task 5); `hasPermission` (`lib/permissions.ts`,
  existing).
- Produces: a reachable page at `/dashboard/reports/lavori`.

- [ ] **Step 1: Create `components/JobsForecastStatsWidget.tsx`**

```tsx
import type { JobsForecastResult } from '@/lib/db';

function formatExact(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `€ ${(value / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}K`;
  }
  return `€ ${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
}

function StatTile({ label, value, exact, color }: { label: string; value: string; exact: string; color: string }) {
  return (
    <div className="border-b border-r border-sky-500/20 px-5 py-3 last:border-r-0">
      <p className="detail-label">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-secondary">{exact}</p>
    </div>
  );
}

const POTENZIALE_COLOR = '#8a8f98';
const PREVENTIVATO_COLOR = '#c9932f';
const CONFERMATO_COLOR = '#0ea5e9';
const FATTURATO_COLOR = '#2f9e6b';
const SPESE_COLOR = '#c94848';

export default function JobsForecastStatsWidget({ totals }: { totals: JobsForecastResult['totals'] }) {
  return (
    <div className="card-shadow mx-6 mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-sky-500/30 bg-sky-500/5 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Potenziale" value={formatCompact(totals.potenziale)} exact={formatExact(totals.potenziale)} color={POTENZIALE_COLOR} />
      <StatTile label="Preventivato" value={formatCompact(totals.preventivato)} exact={formatExact(totals.preventivato)} color={PREVENTIVATO_COLOR} />
      <StatTile label="Confermato" value={formatCompact(totals.confermato)} exact={formatExact(totals.confermato)} color={CONFERMATO_COLOR} />
      <StatTile label="Fatturato" value={formatCompact(totals.fatturato)} exact={formatExact(totals.fatturato)} color={FATTURATO_COLOR} />
      <StatTile label="Spese fornitori" value={formatCompact(totals.speseFornitori)} exact={formatExact(totals.speseFornitori)} color={SPESE_COLOR} />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/reports/lavori/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getJobsForecast, type JobForecastCategory } from '@/lib/db';
import JobsForecastStatsWidget from '@/components/JobsForecastStatsWidget';

export const metadata = { title: 'Overview Lavori' };

const CATEGORY_LABEL: Record<JobForecastCategory, string> = {
  potenziale: 'Potenziale',
  preventivato: 'Preventivato',
  confermato: 'Confermato',
};

function formatEuro(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SearchParams = { year?: string };

export default async function OverviewLavoriPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'reports', 'read')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const fiscalYear = params.year ? Number(params.year) : currentYear;

  const { rows, totals } = await getJobsForecast(fiscalYear);

  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Overview Lavori</h1>
        <form>
          <select
            name="year"
            defaultValue={fiscalYear}
            className="field-input rounded-lg border border-grid-border bg-transparent px-3 py-2 text-sm text-primary"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </form>
      </div>

      <JobsForecastStatsWidget totals={totals} />

      <div className="overflow-x-auto p-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-border text-left text-secondary">
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Lavoro</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Budget stimato</th>
              <th className="px-3 py-2 text-right font-medium">Spese fornitori</th>
              <th className="px-3 py-2 text-right font-medium">Fatturato</th>
              <th className="px-3 py-2 text-right font-medium">Margine</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.jobId} className="border-b border-grid-border/60 text-primary">
                <td className="px-3 py-2">{row.clientName}</td>
                <td className="px-3 py-2">{row.title}</td>
                <td className="px-3 py-2">{CATEGORY_LABEL[row.category]}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.estimatedBudget)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.supplierCost)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.invoicedAmount)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(row.margin)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-secondary">
                  Nessun lavoro con anno di competenza {fiscalYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Turn `app/dashboard/reports/page.tsx` into an index linking to Overview Lavori**

Replace the whole file:

```tsx
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

export const metadata = { title: 'Report' };

export default function ReportsPage() {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Report</h1>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/reports/lavori"
          className="card-shadow flex items-center gap-3 rounded-xl border border-grid-border bg-card-bg p-5 transition hover:bg-row-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-grid-border text-secondary">
            <BarChart2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Overview Lavori</p>
            <p className="text-xs text-secondary">Potenziale, preventivato, confermato e fatturato per anno</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the linter and build, then manually verify with real data**

Run: `npm run lint && npm run build`
Expected: PASS.

Then run: `npm run dev`, sign in as admin/superadmin, open
`/dashboard/reports`, click into "Overview Lavori". Expected: the stat
tiles show non-zero Confermato/Fatturato totals for 2026 (since historic
2026 jobs+invoices were imported), switching the year selector to 2025
shows different totals, and the table lists individual jobs with correct
category labels. Cross-check one job's Fatturato figure against the
Fatture page for the same client to confirm the `ProjectInvoice` sum is
correct. Then sign in as a `dipendente` user and confirm
`/dashboard/reports/lavori` redirects to `/dashboard` (no access).

- [ ] **Step 5: Commit**

```bash
git add components/JobsForecastStatsWidget.tsx app/dashboard/reports/lavori/page.tsx app/dashboard/reports/page.tsx
git commit -m "$(cat <<'EOF'
Aggiunge la pagina Overview Lavori sotto Reports

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-implementation note

`jobs.fiscal_year` is backfilled from `created_at` for historic rows
(Task 1) — this is a best-effort default, not verified per-job against
the original Excel years. Flag to the user that they may want to spot-
check/correct a handful of historic jobs' `fiscalYear` via the edit form
if the Overview Lavori totals for 2024/2025 look off.
