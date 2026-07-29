# Sotto-tab categoria su Lavori Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un filtro a 3 categorie (Standard / Contratti Web / Conteggio Orario) su `/dashboard/jobs`, `/dashboard/jobs/archive` e `/dashboard/jobs/trash`, sostituendo l'attuale toggle binario "conteggio orario".

**Architecture:** Un nuovo parametro `category` su `getJobs()` sostituisce l'attuale `systemGenerated` booleano, applicando la combinazione giusta di `is_system_generated`/`contract_id`. Un nuovo componente client `JobsCategoryTabs` (3 pillole, query param `category`) sostituisce `JobsSystemGeneratedToggle` in tutte e tre le pagine.

**Tech Stack:** Next.js App Router (Server Components + client component per l'interattività), Supabase query builder, Tailwind.

## Global Constraints

- Nessun framework di test automatico in questo repo: il gate di verifica è sempre `npx tsc --noEmit` + `npm run build` (da eseguire in `Dev/lnon-app`).
- Categorie e criterio esatto (dalla spec):
  - `standard` (default se `category` assente): `is_system_generated = false` AND `contract_id` nullo
  - `web`: `is_system_generated = false` AND `contract_id` non nullo
  - `hourly`: `is_system_generated = true`
- Nessuna modifica a `lib/navItems.ts` o alla sidebar: l'asse Lista/Archivio/Cestino resta quello di oggi, `category` è un filtro interno a ciascuna delle tre viste.
- Nessuna migrazione DB: `contract_id` e `is_system_generated` esistono già sullo schema `jobs`.

---

### Task 1: Tipo `JobCategory` + filtro `category` in `getJobs()`

**Files:**
- Modify: `lib/types.ts` (aggiungere il tipo, subito dopo `JobStatus`)
- Modify: `lib/db.ts:388-410` circa (funzione `getJobs`)

**Interfaces:**
- Produces: `export type JobCategory = 'standard' | 'web' | 'hourly';` (da `lib/types.ts`), e `getJobs(filters?: { ...; category?: JobCategory; ... })` — usato da Task 3 e Task 4.

- [ ] **Step 1: Aggiungere il tipo `JobCategory`**

In `lib/types.ts`, subito dopo la riga:

```ts
export type JobStatus = 'preventivato' | 'pre_approvato' | 'in_corso' | 'completato' | 'fatturato' | 'annullato';
```

aggiungere:

```ts

export type JobCategory = 'standard' | 'web' | 'hourly';
```

- [ ] **Step 2: Importare `JobCategory` in `lib/db.ts`**

`lib/db.ts` importa già `JobStatus` da `./types` nell'import type in cima al file (cercare `JobStatus,` nell'import `import type { ... } from './types';` — se non lo trovi con questo nome esatto, cerca il blocco `import type {` più vicino alla cima del file). Aggiungere `JobCategory` allo stesso import, subito dopo `JobStatus`.

- [ ] **Step 3: Sostituire `systemGenerated` con `category` nella firma e nel filtro di `getJobs`**

In `lib/db.ts`, trovare la funzione `getJobs` (firma con `export async function getJobs(filters?: {`). Cambiare:

```ts
  // true = solo lavori generati automaticamente (es. conteggio orario);
  // default/false = solo lavori normali, per tenere la lista pulita
  systemGenerated?: boolean;
```

in:

```ts
  // Categoria del lavoro: 'standard' (default se assente) = manuale/import
  // senza contratto collegato; 'web' = collegato a un Contratto; 'hourly' =
  // generato automaticamente dal Conteggio Orario
  category?: JobCategory;
```

Poi, subito sotto, cambiare la riga:

```ts
  query = query.eq('is_system_generated', filters?.systemGenerated ? true : false);
```

in:

```ts
  const category = filters?.category ?? 'standard';
  if (category === 'hourly') {
    query = query.eq('is_system_generated', true);
  } else {
    query = query.eq('is_system_generated', false);
    query = category === 'web' ? query.not('contract_id', 'is', null) : query.is('contract_id', null);
  }
```

- [ ] **Step 4: Verifica tipi**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit`
Expected: nessun errore (il vecchio call site in `app/dashboard/jobs/page.tsx` che passa `systemGenerated` dà errore atteso a questo punto — verrà sistemato nel Task 3; se preferisci un `tsc` pulito già a questo step, puoi lasciarlo per ora e verificarlo di nuovo a fine Task 3).

- [ ] **Step 5: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add lib/types.ts lib/db.ts
git commit -m "Aggiunge filtro category (standard/web/hourly) a getJobs, sostituendo systemGenerated"
```

---

### Task 2: Componente `JobsCategoryTabs`

**Files:**
- Create: `components/JobsCategoryTabs.tsx`
- Delete: `components/JobsSystemGeneratedToggle.tsx` (sostituito da questo componente)

**Interfaces:**
- Consumes: tipo `JobCategory` da `@/lib/types` (Task 1).
- Produces: `export default function JobsCategoryTabs({ active }: { active: JobCategory }): JSX.Element` — usato da Task 3 e Task 4.

- [ ] **Step 1: Cancellare il vecchio toggle**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
rm components/JobsSystemGeneratedToggle.tsx
```

- [ ] **Step 2: Creare `components/JobsCategoryTabs.tsx`**

```tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { JobCategory } from '@/lib/types';

const OPTIONS: { value: JobCategory; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'web', label: 'Contratti Web' },
  { value: 'hourly', label: 'Conteggio Orario' },
];

export default function JobsCategoryTabs({ active }: { active: JobCategory }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectCategory(value: JobCategory) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'standard') params.delete('category');
    else params.set('category', value);
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => selectCategory(opt.value)}
          aria-pressed={active === opt.value}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            active === opt.value
              ? 'border-transparent bg-grid-header-bg text-primary'
              : 'border-grid-border text-secondary hover:bg-row-hover'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

Nota di stile: stesso pattern a pillole già usato per il filtro anno in `app/dashboard/jobs/archive/page.tsx` (righe 65-85), non il vecchio toggle a icona singola.

- [ ] **Step 3: Verifica tipi**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit`
Expected: errori attesi sui file che ancora importano `JobsSystemGeneratedToggle` (Task 3) — il nuovo componente in sé deve compilare senza errori propri.

- [ ] **Step 4: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add components/JobsCategoryTabs.tsx components/JobsSystemGeneratedToggle.tsx
git commit -m "Sostituisce JobsSystemGeneratedToggle con JobsCategoryTabs (3 categorie)"
```

---

### Task 3: Wiring in `/dashboard/jobs` (lista)

**Files:**
- Modify: `app/dashboard/jobs/page.tsx`

**Interfaces:**
- Consumes: `JobsCategoryTabs` e `JobCategory` (Task 2), `getJobs({ category })` (Task 1).

- [ ] **Step 1: Sostituire l'import del vecchio toggle**

In `app/dashboard/jobs/page.tsx`, riga con:

```ts
import JobsSystemGeneratedToggle from '@/components/JobsSystemGeneratedToggle';
```

sostituire con:

```ts
import JobsCategoryTabs from '@/components/JobsCategoryTabs';
```

e aggiungere, vicino agli altri import di tipi (o crearne uno se non esiste ancora un import da `@/lib/types` in questo file):

```ts
import type { JobCategory } from '@/lib/types';
```

- [ ] **Step 2: Aggiornare il tipo `SearchParams` e la lettura del param**

Cambiare:

```ts
type SearchParams = { q?: string; page?: string; pageSize?: string; clientId?: string; sync?: string; status?: string; system?: string; createProject?: string };
```

in:

```ts
type SearchParams = { q?: string; page?: string; pageSize?: string; clientId?: string; sync?: string; status?: string; category?: string; createProject?: string };
```

Nella funzione `JobsListSection`, trovare:

```ts
  const { q, page, clientId, sync, status, system } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;
  const systemGenerated = system === '1';
```

sostituire con:

```ts
  const { q, page, clientId, sync, status, category: categoryParam } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;
  const category: JobCategory = categoryParam === 'web' || categoryParam === 'hourly' ? categoryParam : 'standard';
```

- [ ] **Step 3: Passare `category` a `getJobs` e sostituire `searchExtra`**

Cambiare:

```ts
  const { data: jobs, total } = await getJobs({
    search: q,
    clientId,
    sync,
    status,
    systemGenerated,
    assignedTo: role === 'dipendente' ? userId : undefined,
    limit: pageSize,
    offset,
  });
```

in:

```ts
  const { data: jobs, total } = await getJobs({
    search: q,
    clientId,
    sync,
    status,
    category,
    assignedTo: role === 'dipendente' ? userId : undefined,
    limit: pageSize,
    offset,
  });
```

e cambiare:

```ts
      searchExtra={<JobsSystemGeneratedToggle active={systemGenerated} />}
```

in:

```ts
      searchExtra={<JobsCategoryTabs active={category} />}
```

- [ ] **Step 4: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti (nessun altro file referenzia più `JobsSystemGeneratedToggle` o `systemGenerated` di `getJobs` a questo punto).

- [ ] **Step 5: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add app/dashboard/jobs/page.tsx
git commit -m "Collega JobsCategoryTabs alla lista /dashboard/jobs"
```

---

### Task 4: Wiring in Archivio e Cestino

**Files:**
- Modify: `app/dashboard/jobs/archive/page.tsx`
- Modify: `app/dashboard/jobs/trash/page.tsx`

**Interfaces:**
- Consumes: `JobsCategoryTabs` e `JobCategory` (Task 2), `getJobs({ category })` (Task 1).

- [ ] **Step 1: `app/dashboard/jobs/archive/page.tsx` — import**

Aggiungere due import, vicino agli altri:

```ts
import JobsCategoryTabs from '@/components/JobsCategoryTabs';
import type { JobCategory } from '@/lib/types';
```

- [ ] **Step 2: `app/dashboard/jobs/archive/page.tsx` — tipo dei searchParams e lettura del param**

Cambiare la firma della funzione da:

```ts
export default async function JobsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; year?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam, year } = await searchParams;
```

in:

```ts
export default async function JobsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; year?: string; category?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam, year, category: categoryParam } = await searchParams;
  const category: JobCategory = categoryParam === 'web' || categoryParam === 'hourly' ? categoryParam : 'standard';
```

- [ ] **Step 3: `app/dashboard/jobs/archive/page.tsx` — passare `category` a `getJobs`**

Cambiare:

```ts
  const [{ data: jobs, total }, years] = await Promise.all([
    getJobs({ search: q, archived: true, archivedYear, limit: pageSize, offset }),
    getArchivedJobYears(),
  ]);
```

in:

```ts
  const [{ data: jobs, total }, years] = await Promise.all([
    getJobs({ search: q, archived: true, archivedYear, category, limit: pageSize, offset }),
    getArchivedJobYears(),
  ]);
```

- [ ] **Step 4: `app/dashboard/jobs/archive/page.tsx` — montare `JobsCategoryTabs` in `ListNavigator`**

Cambiare:

```tsx
      <ListNavigator
        basePath="/dashboard/jobs/archive"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori archiviati"
      >
```

in:

```tsx
      <ListNavigator
        basePath="/dashboard/jobs/archive"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori archiviati"
        searchExtra={<JobsCategoryTabs active={category} />}
      >
```

- [ ] **Step 5: `app/dashboard/jobs/trash/page.tsx` — stesso trattamento**

Aggiungere gli stessi due import:

```ts
import JobsCategoryTabs from '@/components/JobsCategoryTabs';
import type { JobCategory } from '@/lib/types';
```

Cambiare la firma della funzione da:

```ts
export default async function JobsTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam } = await searchParams;
```

in:

```ts
export default async function JobsTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; category?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam, category: categoryParam } = await searchParams;
  const category: JobCategory = categoryParam === 'web' || categoryParam === 'hourly' ? categoryParam : 'standard';
```

Cambiare:

```ts
  const { data: jobs, total } = await getJobs({ search: q, trashed: true, limit: pageSize, offset });
```

in:

```ts
  const { data: jobs, total } = await getJobs({ search: q, trashed: true, category, limit: pageSize, offset });
```

Cambiare:

```tsx
      <ListNavigator
        basePath="/dashboard/jobs/trash"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori nel cestino"
      >
```

in:

```tsx
      <ListNavigator
        basePath="/dashboard/jobs/trash"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori nel cestino"
        searchExtra={<JobsCategoryTabs active={category} />}
      >
```

- [ ] **Step 6: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti.

- [ ] **Step 7: Verifica manuale**

Avviare il dev server (`npm run dev`):
1. `/dashboard/jobs` — cliccare "Conteggio Orario": la lista mostra solo i 7 lavori auto-generati. Cliccare "Contratti Web": lista vuota (nessun job ha ancora un contratto collegato). Cliccare "Standard": torna alla lista normale (default).
2. `/dashboard/jobs/archive` e `/dashboard/jobs/trash` — le stesse 3 pillole compaiono e filtrano allo stesso modo (probabilmente entrambe vuote su "Conteggio Orario" e "Contratti Web", dato che quei lavori raramente vengono archiviati/cestinati — comportamento atteso, non un bug).
3. Cambiare pagina di paginazione, poi cambiare categoria: la paginazione si resetta a pagina 1 (stesso comportamento del vecchio toggle).

- [ ] **Step 8: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add app/dashboard/jobs/archive/page.tsx app/dashboard/jobs/trash/page.tsx
git commit -m "Collega JobsCategoryTabs ad Archivio e Cestino lavori"
```
