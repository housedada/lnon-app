# Spese Fisse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Spese Fisse" (fixed expenses) sub-page under Reports where Admins manage a list of fixed-cost categories (Commercialista, Attrezzatura, Telefono, ecc.) and enter one amount per category per fiscal year, with each year's amount independently activatable/deactivatable from the total without deleting it.

**Architecture:** Same stack and conventions as the Overview Lavori feature (`docs/superpowers/plans/2026-07-25-overview-lavori.md`): Next.js App Router, Supabase/Postgres via `lib/db.ts`, Server Actions in `lib/actions/*.ts`, permission gating via `lib/permissions.ts`. Two new tables: `fixed_expense_categories` (the list of cost categories, soft-deletable) and `fixed_expense_entries` (one row per category+year, holding the amount and an `is_active` flag). The page mirrors the structure of `app/dashboard/reports/lavori/page.tsx`.

**Tech Stack:** Next.js (App Router, Server Components/Actions), TypeScript, Supabase/Postgres, Tailwind CSS, lucide-react.

## Global Constraints

- SQL migrations are plain `.sql` files under `_mat/` in the repo root (`/Users/housedadasnc/Webapp/LNON/_mat/`), run manually against Supabase SQL Editor — no migration runner exists. Follow the naming convention `YYYY-MM-DD-<topic>-migration.sql`.
- No automated test framework (`package.json` only has `dev`/`build`/`start`/`lint`). Verify every task with `npx tsc --noEmit` (fast feedback) and `npm run build` (full check) — both must pass with zero errors. Do not introduce new ESLint errors in files you create or touch (pre-existing `no-explicit-any` errors in `lib/db.ts` are baseline noise, not yours to fix).
- Currency formatting follows `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` (see `components/JobsForecastStatsWidget.tsx`).
- New resource `fixed_expenses` in `PERMISSION_MATRIX` (`lib/permissions.ts`): superadmin gets `read`/`create`/`update`/`delete`; admin gets `read`/`create`/`update` (no `delete` — only superadmin can delete a category, via `canDeleteResource`); dipendente gets no access (`[]`), matching `reports`.
- A `FixedExpenseEntry.isActive = false` excludes that specific category+year amount from the total but keeps it visible and stored — never delete data to "deactivate" it.
- Category deletion (superadmin only) is a soft delete (`deleted_at`), using the existing `DoubleConfirmModal` component pattern for the two-step confirmation (see `components/MarkProjectCompletedButton.tsx` for how it's wired).

---

### Task 1: Database migration — `fixed_expense_categories` and `fixed_expense_entries`

**Files:**
- Create: `/Users/housedadasnc/Webapp/LNON/_mat/2026-07-25-spese-fisse-migration.sql`

**Interfaces:**
- Produces: tables `fixed_expense_categories` (`id`, `label`, `created_by`, `created_at`, `updated_at`, `deleted_at`) and `fixed_expense_entries` (`id`, `category_id`, `fiscal_year`, `amount`, `is_active`, `updated_by`, `updated_at`, unique on `(category_id, fiscal_year)`), seeded with 9 starter categories. Later tasks (2, 3) depend on these existing.

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migrazione: Spese Fisse — categorie di costo fisso e importi per anno
-- (vedi docs/superpowers/specs/2026-07-25-spese-fisse-design.md)
-- Da eseguire manualmente su Supabase SQL Editor
-- Data: 2026-07-25

CREATE TABLE IF NOT EXISTS fixed_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fixed_expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES fixed_expense_categories(id),
  fiscal_year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, fiscal_year)
);

COMMENT ON TABLE fixed_expense_categories IS 'Voci di spesa fissa aziendale (Commercialista, Attrezzatura, ecc.), gestite da Admin/Superadmin.';
COMMENT ON TABLE fixed_expense_entries IS 'Importo di una categoria di spesa fissa per un anno specifico. is_active=false esclude la riga dal totale senza cancellarla.';

-- Seed iniziale: stesse voci del foglio "2026 • Bilancio" dell'Excel di riferimento
INSERT INTO fixed_expense_categories (label, created_by)
SELECT label, (SELECT id FROM users WHERE email = 'nicoloaversa@housedada.com')
FROM (VALUES
  ('Costo del personale'),
  ('Commercialista'),
  ('Attrezzatura'),
  ('Telefono'),
  ('Buoni Pasto'),
  ('Spese studio (affitto + spese)'),
  ('Welfare'),
  ('Rimborsi Chilometrici'),
  ('Ammortamenti')
) AS seed(label);
```

- [ ] **Step 2: Run the migration manually against Supabase SQL Editor**

Open the Supabase project's SQL Editor and paste the full contents of
`_mat/2026-07-25-spese-fisse-migration.sql`, then run it.

- [ ] **Step 3: Verify with read queries in the same SQL Editor**

```sql
-- Expect: 9 rows
SELECT label FROM fixed_expense_categories WHERE deleted_at IS NULL ORDER BY created_at;

-- Expect: 0 rows (no entries yet, that's fine)
SELECT count(*) FROM fixed_expense_entries;
```

- [ ] **Step 4: Report readiness**

Tell the user the migration file is ready and ask them to confirm it has
been run against Supabase before continuing to Task 2 (same handshake used
for the Overview Lavori migration).

---

### Task 2: Add `FixedExpenseCategory`/`FixedExpenseEntry` types and `fixed_expenses` permission

**Files:**
- Modify: `lib/types.ts` (add after the `ProjectInvoice` block, e.g. after line 242)
- Modify: `lib/permissions.ts` (`PERMISSION_MATRIX`, all three roles)

**Interfaces:**
- Produces:
  ```typescript
  export interface FixedExpenseCategory {
    id: string;
    label: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }

  export interface FixedExpenseEntry {
    id: string;
    categoryId: string;
    fiscalYear: number;
    amount: number;
    isActive: boolean;
    updatedBy: string;
    updatedAt: Date;
    categoryLabel?: string;
  }
  ```
  Consumed by Task 3 (`lib/db.ts`), Task 4 (actions), Task 5 (components).

- [ ] **Step 1: Add the two interfaces to `lib/types.ts`**

Insert after the closing `}` of the `ProjectInvoice` interface (currently
ends around line 242, right before `export type ProjectTaskStatus = ...`):

```typescript
export interface FixedExpenseCategory {
  id: string;
  label: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface FixedExpenseEntry {
  id: string;
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
  updatedBy: string;
  updatedAt: Date;
  // Popolato solo in lettura, se collegato
  categoryLabel?: string;
}
```

- [ ] **Step 2: Add `fixed_expenses` to `PERMISSION_MATRIX` in `lib/permissions.ts`**

In the `superadmin` block, add (next to `reports`):

```typescript
    fixed_expenses: ['read', 'create', 'update', 'delete'],
```

In the `admin` block:

```typescript
    fixed_expenses: ['read', 'create', 'update'],
```

In the `dipendente` block:

```typescript
    fixed_expenses: [],
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet, so nothing can be broken by this step alone).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/permissions.ts
git commit -m "$(cat <<'EOF'
Aggiunge tipi FixedExpenseCategory/FixedExpenseEntry e permesso fixed_expenses

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add `lib/db.ts` functions for categories, entries, and the per-year aggregation

**Files:**
- Modify: `lib/db.ts` (add near the end of the file, after the last `ProjectInvoice`-related function — check with `grep -n "^export async function" lib/db.ts | tail -5` to find the exact insertion point)

**Interfaces:**
- Consumes: `FixedExpenseCategory`, `FixedExpenseEntry` (Task 2), `supabaseServer` (existing).
- Produces:
  ```typescript
  export interface FixedExpenseYearRow {
    categoryId: string;
    categoryLabel: string;
    entryId?: string;
    amount: number;
    isActive: boolean;
  }

  export interface FixedExpensesYearResult {
    rows: FixedExpenseYearRow[];
    total: number;
  }

  export async function getFixedExpenseCategories(): Promise<FixedExpenseCategory[]>
  export async function createFixedExpenseCategory(label: string, createdBy: string): Promise<FixedExpenseCategory>
  export async function softDeleteFixedExpenseCategory(id: string): Promise<void>
  export async function getFixedExpensesForYear(fiscalYear: number): Promise<FixedExpensesYearResult>
  export async function upsertFixedExpenseEntry(input: {
    categoryId: string;
    fiscalYear: number;
    amount: number;
    isActive: boolean;
    updatedBy: string;
  }): Promise<FixedExpenseEntry>
  ```
  Later tasks (4, 6) consume these exact names/signatures.

- [ ] **Step 1: Add the row-mapping helpers and CRUD functions**

Add this block at the end of `lib/db.ts`:

```typescript
function fixedExpenseCategoryRowToCategory(row: Record<string, any>): FixedExpenseCategory {
  return {
    id: row.id,
    label: row.label,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

function fixedExpenseEntryRowToEntry(row: Record<string, any>): FixedExpenseEntry {
  return {
    id: row.id,
    categoryId: row.category_id,
    fiscalYear: row.fiscal_year,
    amount: Number(row.amount ?? 0),
    isActive: row.is_active,
    updatedBy: row.updated_by,
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Elenco delle categorie di spesa fissa non eliminate, in ordine di creazione.
 */
export async function getFixedExpenseCategories(): Promise<FixedExpenseCategory[]> {
  const { data, error } = await supabaseServer
    .from('fixed_expense_categories')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fixedExpenseCategoryRowToCategory);
}

/**
 * Crea una nuova categoria di spesa fissa (solo etichetta, l'importo si
 * inserisce separatamente per anno).
 */
export async function createFixedExpenseCategory(label: string, createdBy: string): Promise<FixedExpenseCategory> {
  const { data, error } = await supabaseServer
    .from('fixed_expense_categories')
    .insert([{ label, created_by: createdBy }])
    .select()
    .single();
  if (error) throw error;
  return fixedExpenseCategoryRowToCategory(data);
}

/**
 * Soft delete di una categoria di spesa fissa (solo superadmin, vedi
 * lib/permissions.ts). Non cancella le entry storiche collegate.
 */
export async function softDeleteFixedExpenseCategory(id: string): Promise<void> {
  const { error } = await supabaseServer
    .from('fixed_expense_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export interface FixedExpenseYearRow {
  categoryId: string;
  categoryLabel: string;
  entryId?: string;
  amount: number;
  isActive: boolean;
}

export interface FixedExpensesYearResult {
  rows: FixedExpenseYearRow[];
  total: number;
}

/**
 * Categorie di spesa fissa con l'importo per un anno specifico (0 e attivo
 * di default se non esiste ancora una entry per quella categoria/anno).
 * Il totale somma solo le entry con isActive = true.
 */
export async function getFixedExpensesForYear(fiscalYear: number): Promise<FixedExpensesYearResult> {
  const categories = await getFixedExpenseCategories();

  let entriesByCategoryId = new Map<string, Record<string, any>>();
  if (categories.length > 0) {
    const { data: entryRows, error } = await supabaseServer
      .from('fixed_expense_entries')
      .select('*')
      .eq('fiscal_year', fiscalYear)
      .in('category_id', categories.map((c) => c.id));
    if (error) throw error;
    entriesByCategoryId = (entryRows ?? []).reduce((map, row: any) => {
      map.set(row.category_id, row);
      return map;
    }, new Map<string, Record<string, any>>());
  }

  const rows: FixedExpenseYearRow[] = categories.map((category) => {
    const entryRow = entriesByCategoryId.get(category.id);
    return {
      categoryId: category.id,
      categoryLabel: category.label,
      entryId: entryRow?.id,
      amount: entryRow ? Number(entryRow.amount ?? 0) : 0,
      isActive: entryRow ? entryRow.is_active : true,
    };
  });

  const total = rows.reduce((sum, row) => (row.isActive ? sum + row.amount : sum), 0);

  return { rows, total };
}

/**
 * Crea o aggiorna l'importo/stato attivo di una categoria per un anno
 * specifico (upsert su category_id+fiscal_year).
 */
export async function upsertFixedExpenseEntry(input: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
  updatedBy: string;
}): Promise<FixedExpenseEntry> {
  const { data, error } = await supabaseServer
    .from('fixed_expense_entries')
    .upsert(
      {
        category_id: input.categoryId,
        fiscal_year: input.fiscalYear,
        amount: input.amount,
        is_active: input.isActive,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category_id,fiscal_year' }
    )
    .select()
    .single();
  if (error) throw error;
  return fixedExpenseEntryRowToEntry(data);
}
```

- [ ] **Step 2: Add the two new type imports to the top-of-file import block**

In the `import type { ... } from './types';` block near the top of
`lib/db.ts` (where `Job`, `JobStatus`, etc. are listed), add:

```typescript
  FixedExpenseCategory,
  FixedExpenseEntry,
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "$(cat <<'EOF'
Aggiunge funzioni db per categorie e importi di spesa fissa

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add Server Actions for Spese Fisse

**Files:**
- Create: `lib/actions/fixedExpenses.ts`

**Interfaces:**
- Consumes: `createFixedExpenseCategory`, `softDeleteFixedExpenseCategory`,
  `upsertFixedExpenseEntry` (Task 3); `hasPermission`, `canDeleteResource`
  (`lib/permissions.ts`, existing).
- Produces:
  ```typescript
  export async function createFixedExpenseCategoryAction(formData: FormData): Promise<{ success: boolean; message: string }>
  export async function deleteFixedExpenseCategoryAction(id: string): Promise<{ success: boolean; message: string }>
  export async function upsertFixedExpenseEntryAction(input: {
    categoryId: string;
    fiscalYear: number;
    amount: number;
    isActive: boolean;
  }): Promise<{ success: boolean; message: string }>
  ```
  Consumed directly by Task 5 components.

- [ ] **Step 1: Write the file**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import {
  createFixedExpenseCategory,
  softDeleteFixedExpenseCategory,
  upsertFixedExpenseEntry,
} from '@/lib/db';

async function requireRole(resource: string, action: string): Promise<{ role: 'superadmin' | 'admin' | 'dipendente'; userId: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!role || !userId || !hasPermission(role, resource, action)) {
    throw new Error('Non hai il permesso per questa operazione.');
  }
  return { role, userId };
}

export async function createFixedExpenseCategoryAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('fixed_expenses', 'create');
    const label = String(formData.get('label') || '').trim();
    if (!label) return { success: false, message: 'Il nome della categoria è obbligatorio.' };

    await createFixedExpenseCategory(label, userId);
    revalidatePath('/dashboard/reports/spese-fisse');
    return { success: true, message: `Categoria "${label}" creata.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Errore nella creazione della categoria.' };
  }
}

export async function deleteFixedExpenseCategoryAction(id: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !canDeleteResource(role, '', '', 'fixed_expenses')) {
    return { success: false, message: 'Solo un superadmin può eliminare una categoria di spesa fissa.' };
  }

  await softDeleteFixedExpenseCategory(id);
  revalidatePath('/dashboard/reports/spese-fisse');
  return { success: true, message: 'Categoria eliminata.' };
}

export async function upsertFixedExpenseEntryAction(input: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await requireRole('fixed_expenses', 'update');

    if (!Number.isFinite(input.amount) || input.amount < 0) {
      return { success: false, message: "L'importo deve essere un numero maggiore o uguale a zero." };
    }

    await upsertFixedExpenseEntry({ ...input, updatedBy: userId });
    revalidatePath('/dashboard/reports/spese-fisse');
    return { success: true, message: 'Importo aggiornato.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Errore nell'aggiornamento dell'importo." };
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/fixedExpenses.ts
git commit -m "$(cat <<'EOF'
Aggiunge Server Actions per categorie e importi di spesa fissa

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Generalize the year selector and build the Spese Fisse UI components

**Files:**
- Modify: `components/JobsForecastYearSelect.tsx` → rename to `components/ReportsYearSelect.tsx` (generalize with a `basePath` prop)
- Modify: `app/dashboard/reports/lavori/page.tsx` (update the one usage of the renamed component)
- Create: `components/FixedExpenseAmountInput.tsx`
- Create: `components/FixedExpenseActiveToggle.tsx`
- Create: `components/AddFixedExpenseCategoryModal.tsx`
- Create: `components/DeleteFixedExpenseCategoryButton.tsx`

**Interfaces:**
- Consumes: `upsertFixedExpenseEntryAction`, `createFixedExpenseCategoryAction`,
  `deleteFixedExpenseCategoryAction` (Task 4); `FixedExpenseYearRow` (Task 3);
  `notify` (`lib/notify.ts`, existing); `DoubleConfirmModal` (existing).
- Produces: components consumed directly by Task 6's page.

- [ ] **Step 1: Rename and generalize the year selector**

```bash
git mv components/JobsForecastYearSelect.tsx components/ReportsYearSelect.tsx
```

Replace its contents:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function ReportsYearSelect({
  basePath,
  fiscalYear,
  yearOptions,
}: {
  basePath: string;
  fiscalYear: number;
  yearOptions: number[];
}) {
  const router = useRouter();

  return (
    <select
      value={fiscalYear}
      onChange={(e) => router.push(`${basePath}?year=${e.target.value}`)}
      className="field-input rounded-lg border border-grid-border bg-transparent px-3 py-2 text-sm text-primary"
    >
      {yearOptions.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Update the only existing usage in `app/dashboard/reports/lavori/page.tsx`**

Change the import:

```typescript
import ReportsYearSelect from '@/components/ReportsYearSelect';
```

Change the usage:

```tsx
<ReportsYearSelect basePath="/dashboard/reports/lavori" fiscalYear={fiscalYear} yearOptions={yearOptions} />
```

- [ ] **Step 3: Run typecheck to confirm the rename didn't break anything**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Create `components/FixedExpenseAmountInput.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { upsertFixedExpenseEntryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function FixedExpenseAmountInput({
  categoryId,
  fiscalYear,
  amount,
  isActive,
}: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
}) {
  const [value, setValue] = useState(String(amount));
  const [isPending, startTransition] = useTransition();

  function commit() {
    const num = Number(value);
    if (!Number.isFinite(num) || num === amount) {
      setValue(String(amount));
      return;
    }
    startTransition(async () => {
      const res = await upsertFixedExpenseEntryAction({ categoryId, fiscalYear, amount: num, isActive });
      if (!res.success) {
        notify(res.message);
        setValue(String(amount));
      }
    });
  }

  return (
    <input
      type="number"
      min={0}
      step="0.01"
      value={value}
      disabled={isPending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`field-input w-32 rounded border border-grid-border bg-transparent px-2 py-1 text-right text-sm disabled:opacity-50 ${
        isActive ? 'text-primary' : 'text-secondary line-through'
      }`}
    />
  );
}
```

- [ ] **Step 5: Create `components/FixedExpenseActiveToggle.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { upsertFixedExpenseEntryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function FixedExpenseActiveToggle({
  categoryId,
  fiscalYear,
  amount,
  isActive,
}: {
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await upsertFixedExpenseEntryAction({ categoryId, fiscalYear, amount, isActive: !isActive });
      if (!res.success) notify(res.message);
    });
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-secondary">
      <input type="checkbox" checked={isActive} disabled={isPending} onChange={toggle} className="cursor-pointer" />
      Incluso nel totale
    </label>
  );
}
```

- [ ] **Step 6: Create `components/AddFixedExpenseCategoryModal.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Plus, Loader2 } from 'lucide-react';
import { createFixedExpenseCategoryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';

export default function AddFixedExpenseCategoryModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createFixedExpenseCategoryAction(formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Aggiungi categoria
      </button>
      {open &&
        createPortal(
          <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={isPending ? undefined : () => setOpen(false)}>
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="modal-panel card-shadow w-full max-w-md overflow-hidden rounded-xl bg-card-bg"
            >
              <div className="modal-header-gradient relative flex items-center justify-between gap-3 overflow-hidden px-8 py-5">
                <ParticleCanvasHeader />
                <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
                  <Plus size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
                  Nuova categoria di spesa fissa
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  aria-label="Chiudi"
                  className="relative z-10 text-white/70 transition hover:text-white"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>
              <div className="p-8">
                <div className="field-wrap">
                  <input
                    type="text"
                    name="label"
                    id="category-label"
                    autoFocus
                    placeholder=" "
                    className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
                  />
                  <label htmlFor="category-label" className="field-floating-label">
                    Nome categoria
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-grid-border px-8 py-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover disabled:opacity-60"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {isPending && <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
                  Crea categoria
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
```

- [ ] **Step 7: Create `components/DeleteFixedExpenseCategoryButton.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteFixedExpenseCategoryAction } from '@/lib/actions/fixedExpenses';
import { notify } from '@/lib/notify';

export default function DeleteFixedExpenseCategoryButton({ categoryId, categoryLabel }: { categoryId: string; categoryLabel: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const res = await deleteFixedExpenseCategoryAction(categoryId);
      notify(res.message);
      setOpen(false);
      if (res.success) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={`Elimina categoria ${categoryLabel}`}
        title="Elimina categoria"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <DoubleConfirmModal
          firstMessage={`Eliminare la categoria "${categoryLabel}"?`}
          secondMessage="Verrà nascosta da questa pagina insieme a tutto il suo storico di importi per ogni anno. Confermi?"
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/ReportsYearSelect.tsx components/JobsForecastYearSelect.tsx \
  app/dashboard/reports/lavori/page.tsx components/FixedExpenseAmountInput.tsx \
  components/FixedExpenseActiveToggle.tsx components/AddFixedExpenseCategoryModal.tsx \
  components/DeleteFixedExpenseCategoryButton.tsx
git commit -m "$(cat <<'EOF'
Generalizza il selettore anno dei Report e aggiunge i componenti UI di Spese Fisse

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Build the Spese Fisse page and link it from the Reports index

**Files:**
- Create: `app/dashboard/reports/spese-fisse/page.tsx`
- Modify: `app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `getFixedExpensesForYear` (Task 3); `hasPermission`,
  `canDeleteResource` (existing); `ReportsYearSelect`,
  `FixedExpenseAmountInput`, `FixedExpenseActiveToggle`,
  `AddFixedExpenseCategoryModal`, `DeleteFixedExpenseCategoryButton` (Task 5).
- Produces: a reachable page at `/dashboard/reports/spese-fisse`.

- [ ] **Step 1: Create `app/dashboard/reports/spese-fisse/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import { getFixedExpensesForYear } from '@/lib/db';
import ReportsYearSelect from '@/components/ReportsYearSelect';
import FixedExpenseAmountInput from '@/components/FixedExpenseAmountInput';
import FixedExpenseActiveToggle from '@/components/FixedExpenseActiveToggle';
import AddFixedExpenseCategoryModal from '@/components/AddFixedExpenseCategoryModal';
import DeleteFixedExpenseCategoryButton from '@/components/DeleteFixedExpenseCategoryButton';

export const metadata = { title: 'Spese Fisse' };

function formatEuro(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type SearchParams = { year?: string };

export default async function SpeseFissePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  if (!role || !hasPermission(role, 'fixed_expenses', 'read')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const fiscalYear = params.year ? Number(params.year) : currentYear;

  const { rows, total } = await getFixedExpensesForYear(fiscalYear);

  const canCreate = hasPermission(role, 'fixed_expenses', 'create');
  const canDelete = canDeleteResource(role, '', '', 'fixed_expenses');
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      <div className="flex items-center justify-between p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Spese Fisse</h1>
        <div className="flex items-center gap-3">
          <ReportsYearSelect basePath="/dashboard/reports/spese-fisse" fiscalYear={fiscalYear} yearOptions={yearOptions} />
          {canCreate && <AddFixedExpenseCategoryModal />}
        </div>
      </div>

      <div className="overflow-x-auto p-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-border text-left text-secondary">
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Importo</th>
              <th className="px-3 py-2 font-medium">Stato</th>
              {canDelete && <th className="px-3 py-2 font-medium">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.categoryId} className="border-b border-grid-border/60 text-primary">
                <td className="px-3 py-2">{row.categoryLabel}</td>
                <td className="px-3 py-2 text-right">
                  <FixedExpenseAmountInput categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
                </td>
                <td className="px-3 py-2">
                  <FixedExpenseActiveToggle categoryId={row.categoryId} fiscalYear={fiscalYear} amount={row.amount} isActive={row.isActive} />
                </td>
                {canDelete && (
                  <td className="px-3 py-2">
                    <DeleteFixedExpenseCategoryButton categoryId={row.categoryId} categoryLabel={row.categoryLabel} />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 4 : 3} className="px-3 py-8 text-center text-secondary">
                  Nessuna categoria di spesa fissa.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-grid-border font-semibold text-primary">
                <td className="px-3 py-3">Totale (voci incluse)</td>
                <td className="px-3 py-3 text-right">{formatEuro(total)}</td>
                <td colSpan={canDelete ? 2 : 1} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the "Spese Fisse" card to `app/dashboard/reports/page.tsx`**

Add the `Wallet` icon import and a second `<Link>` card:

```tsx
import Link from 'next/link';
import { BarChart2, Wallet } from 'lucide-react';

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
        <Link
          href="/dashboard/reports/spese-fisse"
          className="card-shadow flex items-center gap-3 rounded-xl border border-grid-border bg-card-bg p-5 transition hover:bg-row-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-grid-border text-secondary">
            <Wallet size={18} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Spese Fisse</p>
            <p className="text-xs text-secondary">Costi fissi aziendali per anno (Commercialista, Attrezzatura, ecc.)</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and full build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, with `/dashboard/reports/spese-fisse` listed among the built
routes.

- [ ] **Step 4: Manually verify with the running app**

Run `npm run dev` (the project's `LOCAL_AUTH_BYPASS=true` dev session acts
as superadmin — see `lib/auth.ts`). Open `/dashboard/reports`, click into
"Spese Fisse". Expected: the 9 seeded categories are listed with amount 0
and "Incluso nel totale" checked; editing an amount and blurring the field
persists it (reload the page to confirm); unchecking "Incluso nel totale"
removes that row's amount from the total shown in the footer without
clearing the input's value; adding a new category via "Aggiungi categoria"
makes it appear immediately with amount 0; deleting a category (via the
trash icon) asks for double confirmation and then removes it from the
list. Switch the year selector and confirm amounts entered for one year do
not appear under a different year.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/reports/spese-fisse/page.tsx app/dashboard/reports/page.tsx
git commit -m "$(cat <<'EOF'
Aggiunge la pagina Spese Fisse sotto Reports

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-implementation note

The user has said they will manually backfill 2026 historic `Job.supplierCost`
values project-by-project (unrelated to this plan, tracked separately in
memory) — not something this plan needs to handle. This plan's seeded fixed
expense amounts start at 0 for every year; historic 2024/2025/2026 fixed cost
figures from the Excel (`_mat/10-riferimento-bilancio-progetti.xlsx`, sheet
"2026 • Bilancio" and equivalents) are **not** backfilled automatically —
flag to the user that they'll want to enter those manually too, the same way
as the job supplier costs.
