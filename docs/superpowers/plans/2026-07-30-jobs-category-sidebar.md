# Categoria Lavori come sotto-voci sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire le pillole categoria in pagina su Lavori con tre route reali (Standard/Contratti Web/Conteggio Orario) selezionabili dalla sidebar, stesso pattern di Contratti (Web/Conteggio Orario).

**Architecture:** La logica di lista di `/dashboard/jobs` viene estratta in un componente server condiviso `JobsListSection` parametrizzato per categoria e basePath; tre pagine sottili (`/dashboard/jobs`, `/dashboard/jobs/web`, `/dashboard/jobs/hourly`) lo richiamano ciascuna con la propria categoria fissa, replicando il pattern già usato da `app/dashboard/contracts/page.tsx` vs `app/dashboard/contracts/hourly/page.tsx`. `navItems.ts` punta le sotto-voci di Lavori a queste tre route al posto di Lista/Archivio/Cestino.

**Tech Stack:** Next.js App Router (Server Components), TypeScript.

## Global Constraints

- Nessun framework di test automatico in questo repo: il gate di verifica è sempre `npx tsc --noEmit` + `npm run build`.
- Nessuna modifica a `lib/db.ts`, al tipo `JobCategory`, ai criteri delle 3 categorie o a `components/JobsCategoryTabs.tsx` — restano esattamente come sono (riusati as-is per Archivio/Cestino).
- Archivio e Cestino Lavori restano dove sono (`/dashboard/jobs/archive`, `/dashboard/jobs/trash`), continuano a usare `JobsCategoryTabs` per il filtro interno — non toccare la loro logica di fetch/filtro, solo rimuovere `RememberRoute` (non più utile: nessuna sotto-voce di sidebar corrisponde più a `archive`/`trash`).
- Il redirect post-salvataggio di un job con `contractId` deve portare alla route `/dashboard/jobs/web` (non più `/dashboard/jobs?category=web`).

---

### Task 1: Estrarre `JobsListSection` e aggiornare la route Standard

**Files:**
- Create: `components/JobsListSection.tsx`
- Modify: `app/dashboard/jobs/page.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface JobsListSectionParams {
    q?: string;
    page?: string;
    pageSize?: string;
    clientId?: string;
    sync?: string;
    status?: string;
  }

  export default async function JobsListSection(props: {
    category: JobCategory;
    basePath: string;
    params: JobsListSectionParams;
    role: 'superadmin' | 'admin' | 'dipendente';
    userId?: string;
    clientOptions: { id: string; name: string }[];
    userOptions: { id: string; name: string; color?: string }[];
    canCreateProjects: boolean;
    canUpdate: boolean;
    canApprove: boolean;
    canDelete: boolean;
    isSuperadmin: boolean;
    showAmounts: boolean;
  }): Promise<JSX.Element>
  ```
  Usato da Task 2 (`/dashboard/jobs/web`, `/dashboard/jobs/hourly`).

- [ ] **Step 1: Creare `components/JobsListSection.tsx`**

Contenuto esatto (estrazione della funzione `JobsListSection` oggi interna a `app/dashboard/jobs/page.tsx`, con `category`/`basePath` come prop fisse invece che lette da `searchParams`, e senza `JobsCategoryTabs` in `searchExtra`):

```tsx
import ListNavigator from '@/components/ListNavigator';
import JobsSelectAllCheckbox from '@/components/JobsSelectAllCheckbox';
import JobsBulkArchiveButton from '@/components/JobsBulkArchiveButton';
import JobRow from '@/components/JobRow';
import LazyRevealRows from '@/components/LazyRevealRows';
import { getJobs } from '@/lib/db';
import { parsePageSize } from '@/lib/listPageSize';
import type { JobCategory } from '@/lib/types';

export interface JobsListSectionParams {
  q?: string;
  page?: string;
  pageSize?: string;
  clientId?: string;
  sync?: string;
  status?: string;
}

export default async function JobsListSection({
  category,
  basePath,
  params,
  role,
  userId,
  clientOptions,
  userOptions,
  canCreateProjects,
  canUpdate,
  canApprove,
  canDelete,
  isSuperadmin,
  showAmounts,
}: {
  category: JobCategory;
  basePath: string;
  params: JobsListSectionParams;
  role: 'superadmin' | 'admin' | 'dipendente';
  userId?: string;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  showAmounts: boolean;
}) {
  const { q, page, clientId, sync, status } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ListNavigator
      basePath={basePath}
      searchPlaceholder="Cerca per titolo..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="lavori"
      extraTopControls={<JobsBulkArchiveButton />}
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div
          className="grid w-full text-[12px]"
          style={{ gridTemplateColumns: '32px repeat(7, minmax(max-content, 1fr)) max-content' }}
        >
          <div className="list-cell-deco flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
            <JobsSelectAllCheckbox jobIds={jobs.map((j) => j.id)} />
          </div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Sync</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Scadenza</div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          <LazyRevealRows total={jobs.length} enabled={pageSize > 25}>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                canCreateProjects={canCreateProjects}
                canUpdate={canUpdate}
                canApprove={canApprove}
                canDelete={canDelete}
                isSuperadmin={isSuperadmin}
                clientOptions={clientOptions}
                userOptions={userOptions}
                showAmounts={showAmounts}
              />
            ))}
          </LazyRevealRows>
        </div>
      </div>
    </ListNavigator>
  );
}
```

- [ ] **Step 2: Riscrivere `app/dashboard/jobs/page.tsx`**

Sostituire l'intero contenuto del file con:

```tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobById, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource, canViewAmounts } from '@/lib/permissions';
import ListPlaceholder from '@/components/ListPlaceholder';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import NewJobButton from '@/components/NewJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import JobCreateProjectFlow from '@/components/JobCreateProjectFlow';
import JobsListSection, { type JobsListSectionParams } from '@/components/JobsListSection';

export const metadata = { title: 'Lavori' };

type SearchParams = JobsListSectionParams & { createProject?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [clientOptions, contractOptions, productOptions, allUsers] = await Promise.all([
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const canCreateProjects = hasPermission(role, 'projects', 'create');
  const canCreate = hasPermission(role, 'jobs', 'create');
  const canUpdate = hasPermission(role, 'jobs', 'update');
  const canApprove = hasPermission(role, 'jobs', 'approve');
  const canDelete = canDeleteResource(role, '', '', 'jobs');
  const isSuperadmin = role === 'superadmin';
  const showAmounts = canViewAmounts(role);
  const canManageInvoices = role === 'superadmin' || role === 'admin';
  const createProjectJob = params.createProject && canCreateProjects ? await getJobById(params.createProject).catch(() => null) : null;

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
      <JobCreateProjectFlow
        job={createProjectJob ? { id: createProjectJob.id, title: createProjectJob.title } : null}
        userOptions={userOptions}
        canManageInvoices={canManageInvoices}
      />
      <RememberRoute storageKey="jobs-tab" tabKey="standard" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Lavori</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <NewJobButton
              clientOptions={clientOptions}
              contractOptions={contractOptions}
              productOptions={productOptions}
              userOptions={userOptions}
            />
          )}
          {canUpdate && <SyncJobsClientsButton />}
          <Link
            href="/dashboard/jobs/archive"
            aria-label="Archivio lavori"
            title="Archivio lavori"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard/jobs/trash"
            aria-label="Cestino lavori"
            title="Cestino lavori"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <JobsFilterBar clientOptions={clientOptions} />

      <Suspense fallback={<ListPlaceholder />}>
        <JobsListSection
          category="standard"
          basePath="/dashboard/jobs"
          params={params}
          role={role}
          userId={(session?.user as { id?: string } | undefined)?.id}
          clientOptions={clientOptions}
          userOptions={userOptions}
          canCreateProjects={canCreateProjects}
          canUpdate={canUpdate}
          canApprove={canApprove}
          canDelete={canDelete}
          isSuperadmin={isSuperadmin}
          showAmounts={showAmounts}
        />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti (a questo punto `/dashboard/jobs` funziona come Standard, senza pillole; `/dashboard/jobs/web` e `/dashboard/jobs/hourly` non esistono ancora — arrivano nel Task 2).

- [ ] **Step 4: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add components/JobsListSection.tsx app/dashboard/jobs/page.tsx
git commit -m "Estrae JobsListSection condiviso, rimuove pillole categoria dalla route Standard"
```

---

### Task 2: Nuove route `/dashboard/jobs/web` e `/dashboard/jobs/hourly`

**Files:**
- Create: `app/dashboard/jobs/web/page.tsx`
- Create: `app/dashboard/jobs/hourly/page.tsx`

**Interfaces:**
- Consumes: `JobsListSection`/`JobsListSectionParams` da `@/components/JobsListSection` (Task 1).

- [ ] **Step 1: Creare `app/dashboard/jobs/web/page.tsx`**

Stesso impianto di `app/dashboard/jobs/page.tsx` post-Task-1, con categoria `web` e senza il flusso `createProject` (quel flusso resta solo sulla route Standard, dove nasce oggi il pulsante "Crea progetto" dalla lista — i job con contratto collegato possono comunque avere progetti creati dalla loro riga, la action non dipende dalla categoria):

```tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource, canViewAmounts } from '@/lib/permissions';
import ListPlaceholder from '@/components/ListPlaceholder';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import NewJobButton from '@/components/NewJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import JobsListSection, { type JobsListSectionParams } from '@/components/JobsListSection';

export const metadata = { title: 'Lavori · Contratti Web' };

export default async function JobsWebPage({ searchParams }: { searchParams: Promise<JobsListSectionParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [clientOptions, contractOptions, productOptions, allUsers] = await Promise.all([
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const canCreateProjects = hasPermission(role, 'projects', 'create');
  const canCreate = hasPermission(role, 'jobs', 'create');
  const canUpdate = hasPermission(role, 'jobs', 'update');
  const canApprove = hasPermission(role, 'jobs', 'approve');
  const canDelete = canDeleteResource(role, '', '', 'jobs');
  const isSuperadmin = role === 'superadmin';
  const showAmounts = canViewAmounts(role);

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
      <RememberRoute storageKey="jobs-tab" tabKey="web" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Lavori</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <NewJobButton
              clientOptions={clientOptions}
              contractOptions={contractOptions}
              productOptions={productOptions}
              userOptions={userOptions}
            />
          )}
          {canUpdate && <SyncJobsClientsButton />}
          <Link
            href="/dashboard/jobs/archive"
            aria-label="Archivio lavori"
            title="Archivio lavori"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard/jobs/trash"
            aria-label="Cestino lavori"
            title="Cestino lavori"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <JobsFilterBar clientOptions={clientOptions} />

      <Suspense fallback={<ListPlaceholder />}>
        <JobsListSection
          category="web"
          basePath="/dashboard/jobs/web"
          params={params}
          role={role}
          userId={(session?.user as { id?: string } | undefined)?.id}
          clientOptions={clientOptions}
          userOptions={userOptions}
          canCreateProjects={canCreateProjects}
          canUpdate={canUpdate}
          canApprove={canApprove}
          canDelete={canDelete}
          isSuperadmin={isSuperadmin}
          showAmounts={showAmounts}
        />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Creare `app/dashboard/jobs/hourly/page.tsx`**

Identico al file del Step 1, con queste sole differenze: `metadata.title` = `'Lavori · Conteggio Orario'`, nome funzione `JobsHourlyPage`, `RememberRoute tabKey="hourly"`, `category="hourly"`, `basePath="/dashboard/jobs/hourly"`.

- [ ] **Step 3: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti, tre nuove route (`/dashboard/jobs`, `/dashboard/jobs/web`, `/dashboard/jobs/hourly`) presenti nell'elenco delle route generate da `npm run build`.

- [ ] **Step 4: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add app/dashboard/jobs/web/page.tsx app/dashboard/jobs/hourly/page.tsx
git commit -m "Aggiunge route Contratti Web e Conteggio Orario per Lavori"
```

---

### Task 3: Sidebar, redirect post-salvataggio, pulizia Archivio/Cestino

**Files:**
- Modify: `lib/navItems.ts`
- Modify: `lib/actions/jobs.ts`
- Modify: `app/dashboard/jobs/archive/page.tsx`
- Modify: `app/dashboard/jobs/trash/page.tsx`

**Interfaces:** nessuna nuova, solo wiring finale.

- [ ] **Step 1: Aggiornare le sotto-voci di sidebar in `lib/navItems.ts`**

Cercare il blocco `resource: 'jobs'` (con `subItems: [{ label: 'Lista', ... }, { label: 'Archivio', ... }, { label: 'Cestino', ... }]`) e sostituirlo con:

```ts
  {
    resource: 'jobs',
    label: 'Lavori',
    href: '/dashboard/jobs',
    icon: Briefcase,
    description: 'Pianificazione e avanzamento dei lavori',
    viewStorageKey: 'jobs-tab',
    subItems: [
      { label: 'Standard', href: '/dashboard/jobs', storageValue: 'standard' },
      { label: 'Contratti Web', href: '/dashboard/jobs/web', storageValue: 'web' },
      { label: 'Conteggio Orario', href: '/dashboard/jobs/hourly', storageValue: 'hourly' },
    ],
  },
```

- [ ] **Step 2: Aggiornare i redirect post-salvataggio in `lib/actions/jobs.ts`**

Cercare le due righe (in `createJobAction` e `updateJobAction`):

```ts
  redirect(job.contractId ? '/dashboard/jobs?saved=1&category=web' : '/dashboard/jobs?saved=1');
```
```ts
  redirect(data.contractId ? '/dashboard/jobs?saved=1&category=web' : '/dashboard/jobs?saved=1');
```

sostituirle rispettivamente con:

```ts
  redirect(job.contractId ? '/dashboard/jobs/web?saved=1' : '/dashboard/jobs?saved=1');
```
```ts
  redirect(data.contractId ? '/dashboard/jobs/web?saved=1' : '/dashboard/jobs?saved=1');
```

- [ ] **Step 3: Rimuovere `RememberRoute` da Archivio e Cestino**

In `app/dashboard/jobs/archive/page.tsx`, rimuovere la riga:

```tsx
      <RememberRoute storageKey="jobs-tab" tabKey="archive" />
```

e l'import corrispondente:

```ts
import RememberRoute from '@/components/RememberRoute';
```

(solo se non altrimenti utilizzato nel file — verificare con una ricerca testuale prima di rimuovere l'import).

In `app/dashboard/jobs/trash/page.tsx`, stessa cosa: rimuovere

```tsx
      <RememberRoute storageKey="jobs-tab" tabKey="trash" />
```

e il relativo import (con la stessa verifica).

- [ ] **Step 4: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti.

- [ ] **Step 5: Verifica manuale**

Avviare il dev server (`npm run dev`):
1. Sidebar → sotto "Lavori" compaiono Standard / Contratti Web / Conteggio Orario. Cliccare ciascuna: naviga alla route corretta con i job filtrati correttamente (Standard = la lista di sempre, Contratti Web = vuota oggi, Conteggio Orario = i 7 job auto-generati).
2. Dalla pagina Standard, cliccare le icone Archivio/Cestino in alto a destra: portano ancora a `/dashboard/jobs/archive` e `/dashboard/jobs/trash`, che mostrano ancora le pillole `JobsCategoryTabs` per filtrare al loro interno.
3. Creare o modificare un job impostando un contratto collegato: dopo il salvataggio si finisce su `/dashboard/jobs/web`, dove il job compare.
4. Cliccare "Lavori" nella sidebar da un'altra sezione: torna all'ultima sotto-voce visitata (standard/web/hourly), non più a Lista/Archivio/Cestino.

- [ ] **Step 6: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add lib/navItems.ts lib/actions/jobs.ts app/dashboard/jobs/archive/page.tsx app/dashboard/jobs/trash/page.tsx
git commit -m "Collega sidebar e redirect alle nuove route categoria Lavori"
```
