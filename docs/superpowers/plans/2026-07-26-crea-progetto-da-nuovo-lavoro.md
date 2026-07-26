# Toggle "crea anche progetto" nella creazione lavoro — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un toggle nel form di creazione lavoro che, se attivo, guida l'utente attraverso la creazione contestuale del progetto collegato e l'apertura immediata dell'interfaccia per aggiungere i sottotask, riusando i componenti esistenti (`CreateProjectFromJobModal`, `ProjectDetailModal`).

**Architecture:** Flusso a due step orchestrato da un nuovo componente client (`JobCreateProjectFlow`), innescato da un redirect con query param dopo il salvataggio del lavoro. Nessun nuovo componente di UI "pesante": si riusano `CreateProjectFromJobModal` (step 1: conferma titolo/assegnatario progetto) e `ProjectDetailModal` (step 2: aggiunta sottotask), entrambi già esistenti e usati altrove nell'app.

**Tech Stack:** Next.js App Router (Server Actions + Server Components), React client components per l'orchestrazione, Supabase via `lib/db.ts`.

## Global Constraints

- Il toggle "Crea anche un progetto collegato" appare **solo** nel form di creazione lavoro (`job` prop assente in `JobForm`), non in modifica.
- Default del toggle: **acceso**.
- Nessuna modifica di comportamento per gli utenti che non attivano il toggle: redirect identico a oggi (`?saved=1`).
- Nessuna modifica di comportamento per i punti dell'app che già usano `CreateProjectFromJobModal`/`CreateProjectFromJobButton`/`ProjectDetailModal` oggi (righe Lavori, board Task) — ogni nuova prop introdotta è opzionale.
- Se l'utente arriva con `?createProject=<jobId>` in URL senza il permesso di creare progetti, o il lavoro non esiste più, il flusso non apre nulla e ripulisce silenziosamente il query param.
- Tutte le stringhe utente sono in italiano.

---

### Task 1: Estendere `createProjectFromJobAction` per ritornare il progetto creato

**Files:**
- Modify: `lib/actions/projects.ts`

**Interfaces:**
- Produces: `createProjectFromJobAction(jobId: string, formData: FormData): Promise<{ success: boolean; message: string; project?: Project }>` (era `{ success: boolean; message: string }`)

- [ ] **Step 1: Aggiungere l'import del tipo `Project`**

In `lib/actions/projects.ts`, verificare l'import esistente di tipi da `@/lib/types` (se `Project` non è già importato, aggiungerlo). Cercare la riga di import esistente e assicurarsi che includa `Project`:

```typescript
import type { Project } from '@/lib/types';
```

(Se un import di tipi da `@/lib/types` esiste già nel file, unire `Project` a quello invece di aggiungere una riga duplicata.)

- [ ] **Step 2: Modificare la firma e il corpo di `createProjectFromJobAction`**

Sostituire la funzione esistente:

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

con:

```typescript
export async function createProjectFromJobAction(
  jobId: string,
  formData: FormData
): Promise<{ success: boolean; message: string; project?: Project }> {
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

  const project = await createDbProject({
    title,
    jobId,
    assignedTo,
    createdBy: userId,
  });

  revalidatePath('/dashboard/tasks');
  revalidatePath('/dashboard/jobs');
  return { success: true, message: `Progetto "${title}" creato da questo lavoro.`, project };
}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `lib/actions/projects.ts`. Nessun errore nei call site esistenti (`components/JobRow.tsx`, `components/CreateProjectFromJobButton.tsx`) perché il campo `project` in più nel risultato è additivo e non usato lì.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/projects.ts
git commit -m "createProjectFromJobAction ritorna anche il progetto creato"
```

---

### Task 2: Aggiungere il callback `onSuccess` opzionale a `CreateProjectFromJobModal`

**Files:**
- Modify: `components/CreateProjectFromJobModal.tsx`

**Interfaces:**
- Consumes: `createProjectFromJobAction` (esteso al Task 1, ritorna `project?: Project`)
- Produces: nuova prop opzionale `onSuccess?: (project: Project) => void` su `CreateProjectFromJobModal`

- [ ] **Step 1: Aggiungere l'import del tipo `Project`**

In `components/CreateProjectFromJobModal.tsx`, aggiungere in cima al file, vicino agli altri import:

```typescript
import type { Project } from '@/lib/types';
```

- [ ] **Step 2: Estendere la firma del componente con `onSuccess`**

Sostituire:

```typescript
export default function CreateProjectFromJobModal({
  jobId,
  jobTitle,
  userOptions,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  userOptions: { id: string; name: string; color?: string }[];
  onClose: () => void;
}) {
```

con:

```typescript
export default function CreateProjectFromJobModal({
  jobId,
  jobTitle,
  userOptions,
  onClose,
  onSuccess,
}: {
  jobId: string;
  jobTitle: string;
  userOptions: { id: string; name: string; color?: string }[];
  onClose: () => void;
  onSuccess?: (project: Project) => void;
}) {
```

- [ ] **Step 3: Usare `onSuccess` quando presente, altrimenti mantenere il comportamento attuale**

Sostituire il corpo di `handleSubmit`:

```typescript
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createProjectFromJobAction(jobId, formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        onClose();
      }
    });
  }
```

con:

```typescript
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createProjectFromJobAction(jobId, formData);
      notify(res.message);
      if (res.success) {
        router.refresh();
        if (onSuccess && res.project) {
          onSuccess(res.project);
        } else {
          onClose();
        }
      }
    });
  }
```

Nota: i chiamanti esistenti (`components/JobRow.tsx`, `components/CreateProjectFromJobButton.tsx`) non passano `onSuccess`, quindi continuano a chiamare `onClose()` come oggi — nessuna modifica di comportamento per loro.

- [ ] **Step 4: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/CreateProjectFromJobModal.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/CreateProjectFromJobModal.tsx
git commit -m "Aggiunge callback onSuccess opzionale a CreateProjectFromJobModal"
```

---

### Task 3: Toggle nel form di creazione lavoro e redirect condizionale

**Files:**
- Modify: `components/JobForm.tsx`
- Modify: `lib/actions/jobs.ts`

**Interfaces:**
- Produces: campo form `name="createProject"` (checkbox), presente solo quando `job` (prop di `JobForm`) è assente.

- [ ] **Step 1: Aggiungere il toggle in `JobForm.tsx`**

Nel file `components/JobForm.tsx`, individuare il blocco finale del form:

```tsx
      <div className="flex items-center justify-between gap-3">
        <div>{secondaryAction}</div>
        <button type="submit" className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
      </div>
```

Sostituirlo con (il toggle compare solo in creazione, cioè quando `!job`):

```tsx
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {secondaryAction}
          {!job && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                name="createProject"
                value="1"
                defaultChecked
                className="h-4 w-4 rounded border-grid-border accent-[var(--color-accent)]"
              />
              Crea anche un progetto collegato e aggiungi subito i task
            </label>
          )}
        </div>
        <button type="submit" className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
      </div>
```

- [ ] **Step 2: Leggere il flag e cambiare il redirect in `createJobAction`**

In `lib/actions/jobs.ts`, sostituire:

```typescript
export async function createJobAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'jobs', 'create')) {
    throw new Error('Non hai il permesso di creare lavori.');
  }

  const data = parseJobFormData(formData);
  await createDbJob({ ...data, createdBy: userId });
  redirect('/dashboard/jobs?saved=1');
}
```

con:

```typescript
export async function createJobAction(formData: FormData) {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!role || !userId || !hasPermission(role, 'jobs', 'create')) {
    throw new Error('Non hai il permesso di creare lavori.');
  }

  const data = parseJobFormData(formData);
  const job = await createDbJob({ ...data, createdBy: userId });

  if (formData.get('createProject')) {
    redirect(`/dashboard/jobs?createProject=${job.id}`);
  }
  redirect('/dashboard/jobs?saved=1');
}
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/JobForm.tsx` e `lib/actions/jobs.ts`.

- [ ] **Step 4: Commit**

```bash
git add components/JobForm.tsx lib/actions/jobs.ts
git commit -m "Aggiunge toggle crea-progetto nel form di creazione lavoro"
```

---

### Task 4: Componente orchestratore `JobCreateProjectFlow`

**Files:**
- Create: `components/JobCreateProjectFlow.tsx`

**Interfaces:**
- Consumes: `CreateProjectFromJobModal` (esteso al Task 2, con `onSuccess`), `ProjectDetailModal` (esistente, invariato).
- Produces: `export default function JobCreateProjectFlow(props: { job: { id: string; title: string } | null; userOptions: { id: string; name: string; color?: string }[]; canManageInvoices: boolean }): JSX.Element`

- [ ] **Step 1: Creare il file**

```typescript
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import type { Project } from '@/lib/types';

type Step = 'confirm' | 'tasks' | null;

/**
 * Orchestra il flusso "crea lavoro -> crea progetto -> aggiungi task" innescato
 * dal toggle nel form del lavoro: riusa CreateProjectFromJobModal (step 1) e
 * ProjectDetailModal (step 2, lo stesso della card progetto in Task) senza
 * introdurre nuovi componenti di dettaglio.
 */
function JobCreateProjectFlowInner({
  job,
  userOptions,
  canManageInvoices,
}: {
  job: { id: string; title: string } | null;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>(job ? 'confirm' : null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    setStep(job ? 'confirm' : null);
    setProject(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  function clearParam() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('createProject');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleClose() {
    setStep(null);
    setProject(null);
    clearParam();
  }

  if (!job || !step) return null;

  return (
    <>
      {step === 'confirm' && (
        <CreateProjectFromJobModal
          jobId={job.id}
          jobTitle={job.title}
          userOptions={userOptions}
          onClose={handleClose}
          onSuccess={(createdProject) => {
            setProject({ ...createdProject, jobTitle: job.title });
            setStep('tasks');
          }}
        />
      )}
      {step === 'tasks' && project && (
        <ProjectDetailModal
          project={project}
          initialTasks={[]}
          userOptions={userOptions}
          canManageInvoices={canManageInvoices}
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default function JobCreateProjectFlow(props: {
  job: { id: string; title: string } | null;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <JobCreateProjectFlowInner {...props} />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `components/JobCreateProjectFlow.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/JobCreateProjectFlow.tsx
git commit -m "Aggiunge orchestratore JobCreateProjectFlow per il flusso lavoro->progetto->task"
```

---

### Task 5: Montare `JobCreateProjectFlow` nella lista Lavori

**Files:**
- Modify: `app/dashboard/jobs/page.tsx`

**Interfaces:**
- Consumes: `JobCreateProjectFlow` (Task 4), `getJobById` (già esistente in `@/lib/db`, già importato/usato altrove nel progetto).

- [ ] **Step 1: Aggiungere l'import**

In `app/dashboard/jobs/page.tsx`, estendere l'import esistente da `@/lib/db`:

```typescript
import { getJobs, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
```

in:

```typescript
import { getJobs, getJobById, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
```

Aggiungere anche l'import del nuovo componente, vicino agli altri import di componenti:

```typescript
import JobCreateProjectFlow from '@/components/JobCreateProjectFlow';
```

- [ ] **Step 2: Estendere `SearchParams` col nuovo query param**

Sostituire:

```typescript
type SearchParams = { q?: string; page?: string; pageSize?: string; clientId?: string; sync?: string; status?: string; system?: string };
```

con:

```typescript
type SearchParams = { q?: string; page?: string; pageSize?: string; clientId?: string; sync?: string; status?: string; system?: string; createProject?: string };
```

- [ ] **Step 3: Calcolare `canManageInvoices` in `JobsPage`**

Nel corpo di `JobsPage`, subito dopo la riga esistente:

```typescript
  const showAmounts = canViewAmounts(role);
```

aggiungere:

```typescript
  const canManageInvoices = role === 'superadmin' || role === 'admin';
```

- [ ] **Step 4: Risolvere il lavoro da `createProject` e montare il flow**

Sempre nel corpo di `JobsPage`, subito dopo il calcolo di `canManageInvoices` appena aggiunto, aggiungere:

```typescript
  const createProjectJob = params.createProject && canCreateProjects ? await getJobById(params.createProject) : null;
```

Poi, nel JSX ritornato da `JobsPage`, subito dopo la riga esistente:

```tsx
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
```

aggiungere:

```tsx
      <JobCreateProjectFlow
        job={createProjectJob ? { id: createProjectJob.id, title: createProjectJob.title } : null}
        userOptions={userOptions}
        canManageInvoices={canManageInvoices}
      />
```

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore in `app/dashboard/jobs/page.tsx`.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build pulita, nessun errore.

- [ ] **Step 7: Test manuale end-to-end**

Run: `npm run dev`
Verifica manuale:
1. Andare su `/dashboard/jobs/new`, verificare che il toggle "Crea anche un progetto collegato e aggiungi subito i task" sia presente e acceso di default.
2. Compilare il form minimo (titolo, cliente) e salvare con il toggle acceso.
3. Verificare l'atterraggio su `/dashboard/jobs` con l'apertura automatica del mini-modale "Genera progetto" (titolo precompilato).
4. Confermare: verificare l'apertura automatica di `ProjectDetailModal` con lista task vuota.
5. Aggiungere un sottotask e chiudere il modale: verificare che il query param `createProject` sparisca dall'URL.
6. Andare nella board Task e verificare che il progetto appena creato compaia con il sottotask aggiunto.
7. Ripetere la creazione di un lavoro con il toggle spento: verificare che il comportamento resti quello di oggi (`?saved=1`, nessun modale).
8. Verificare che il form di modifica di un lavoro esistente (`/dashboard/jobs/[id]/edit`) non mostri il toggle.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/jobs/page.tsx
git commit -m "Monta JobCreateProjectFlow nella lista Lavori per il flusso lavoro->progetto->task"
```

Al termine di questo task, se tutte le verifiche passano, procedere con **superpowers:finishing-a-development-branch**.
