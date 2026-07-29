# Inline Select Cell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere di cambiare lo stato di un Job direttamente dalla lista `/dashboard/jobs`, cliccando sul badge di stato, con salvataggio immediato via server action (autosave, nessun form da aprire).

**Architecture:** Un componente client generico `InlineSelectCell` (popover in portal, stesso pattern di `RowContextMenu`) gestisce apertura/chiusura, stato ottimistico e chiamata alla server action passata dal chiamante. `JobRow.tsx` lo usa per lo stato, alimentato da una nuova `updateJobStatusAction`. Nessuna libreria nuova.

**Tech Stack:** Next.js App Router (Server Actions), React (client component con `useState`/`useEffect`), Tailwind, `createPortal` da `react-dom`.

## Global Constraints

- Nessun framework di test automatico in questo repo: il gate di verifica è sempre `npx tsc --noEmit` + `npm run build` (da eseguire in `Dev/lnon-app`), non `pytest`/`jest`.
- Le server action per operazioni da lista ritornano sempre `{ success: boolean; message: string }` e non fanno `redirect` (a differenza delle action del form completo) — pattern già in uso in `deleteJobFromListAction` (`lib/actions/jobs.ts:110`).
- I toast/notifiche passano sempre da `notify()` in `lib/notify.ts`, mai da `alert()`.
- Pulsanti/celle con azione server-action devono mostrare feedback di stato pending visibile (convenzione di progetto).
- Nessuna mappa di transizioni valide per stato: il picker permette liberamente tutti e 6 i valori di `JobStatus`.

---

### Task 1: `updateJobStatusAction` — server action per il cambio stato da lista

**Files:**
- Modify: `lib/actions/jobs.ts` (aggiungere in fondo al file, dopo `deleteJobFromListAction`)

**Interfaces:**
- Consumes: `hasPermission` da `@/lib/permissions` (già importato), `updateDbJob` da `@/lib/db` (già importato), `auth` da `@/lib/auth` (già importato), tipo `JobStatus` da `@/lib/types` (da aggiungere all'import esistente `import type { Job } from '@/lib/types';`).
- Produces: `updateJobStatusAction(jobId: string, status: JobStatus): Promise<{ success: boolean; message: string }>`, usata da Task 3.

- [ ] **Step 1: Aggiungere `JobStatus` all'import dei tipi**

In `lib/actions/jobs.ts`, riga 21, cambiare:

```ts
import type { Job } from '@/lib/types';
```

in:

```ts
import type { Job, JobStatus } from '@/lib/types';
```

- [ ] **Step 2: Aggiungere la action in fondo al file**

Dopo la funzione `deleteJobFromListAction` (che termina alla riga 122 con `}`), aggiungere:

```ts
/**
 * Cambia lo stato di un lavoro da un contesto lista (InlineSelectCell):
 * niente redirect, torna un esito per il toast e l'aggiornamento ottimistico.
 */
export async function updateJobStatusAction(jobId: string, status: JobStatus): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!role || !hasPermission(role, 'jobs', 'update')) {
    return { success: false, message: 'Non hai il permesso di modificare questo lavoro.' };
  }

  await updateDbJob(jobId, { status });
  revalidatePath('/dashboard/jobs');
  return { success: true, message: 'Stato aggiornato.' };
}
```

- [ ] **Step 3: Verifica tipi**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add lib/actions/jobs.ts
git commit -m "Aggiunge updateJobStatusAction per il cambio stato Job da lista"
```

---

### Task 2: `InlineSelectCell` — componente generico

**Files:**
- Create: `components/InlineSelectCell.tsx`
- Modify: `app/globals.css` (nuove classi per il pannello popover)

**Interfaces:**
- Consumes: `notify` da `@/lib/notify` (esiste già, firma `notify(message: string, options?: NotifyOptions)`).
- Produces:
  ```ts
  interface InlineSelectOption<T extends string> {
    value: T;
    label: string;
    badgeClassName: string;
  }

  interface InlineSelectCellProps<T extends string> {
    value: T;
    options: InlineSelectOption<T>[];
    onSave: (newValue: T) => Promise<{ success: boolean; message: string }>;
  }

  export default function InlineSelectCell<T extends string>(props: InlineSelectCellProps<T>): JSX.Element
  ```
  Usato da Task 3.

- [ ] **Step 1: Scrivere il componente**

Creare `components/InlineSelectCell.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';

export interface InlineSelectOption<T extends string> {
  value: T;
  label: string;
  badgeClassName: string;
}

interface InlineSelectCellProps<T extends string> {
  value: T;
  options: InlineSelectOption<T>[];
  onSave: (newValue: T) => Promise<{ success: boolean; message: string }>;
}

/**
 * Badge cliccabile che apre un popover con una lista di opzioni: alla
 * selezione salva subito (autosave) tramite la server action passata,
 * aggiornando il badge in modo ottimistico. Generico: non sa nulla del
 * dominio (Job/status/ecc.), riceve valore, opzioni e callback di salvataggio
 * già "bindata" alla riga dal chiamante (stesso pattern di
 * deleteJobFromListAction.bind(null, jobId) usato altrove nell'app).
 */
export default function InlineSelectCell<T extends string>({ value, options, onSave }: InlineSelectCellProps<T>) {
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  useEffect(() => {
    if (!pos) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPos(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos]);

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: rect.left });
  }

  function closePopover() {
    setPos(null);
  }

  async function handleSelect(e: React.MouseEvent, newValue: T) {
    e.stopPropagation();
    closePopover();
    if (newValue === optimisticValue) return;

    const previousValue = optimisticValue;
    setOptimisticValue(newValue);
    setIsPending(true);

    const res = await onSave(newValue);

    setIsPending(false);
    if (!res.success) {
      setOptimisticValue(previousValue);
      notify(res.message);
    }
  }

  const currentOption = options.find((o) => o.value === optimisticValue);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        className={`relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition hover:brightness-95 ${currentOption?.badgeClassName ?? ''}`}
      >
        {currentOption?.label ?? optimisticValue}
        {isPending && <Loader2 size={10} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={closePopover} />
            <div
              role="menu"
              className="inline-select-popover fixed z-[200] min-w-40 text-sm"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="inline-select-options">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelect(e, opt.value)}
                    className={`inline-select-option flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-row-hover ${
                      opt.value === optimisticValue ? 'text-primary' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${opt.badgeClassName}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
```

- [ ] **Step 2: Aggiungere le classi CSS del popover in `app/globals.css`**

Aggiungere le variabili `--color-popover-grad-a`/`--color-popover-grad-b` nei 4 blocchi di token esistenti (`:root` default, `@media (prefers-color-scheme: dark) { :root { ... } }`, `:root[data-theme='light']`, `:root[data-theme='dark']`), accanto a `--accent-from`/`--accent-to`/`--accent-text`: molto chiaro (`#ffffff` / `#f5f5f4`) nei due blocchi giorno, molto scuro (`#131017` / `#201b28`, coerente con `--color-chrome-bg` della sidebar in tema notte) nei due blocchi notte.

Poi, subito dopo la classe `.card-shadow` (cercare `.card-shadow {` in `app/globals.css`), aggiungere:

```css
/* Popover di InlineSelectCell: gradiente animato molto chiaro in tema
   giorno / molto scuro in tema notte (coerente con --color-chrome-bg della
   sidebar), non lo sfondo card-bg piatto usato dagli altri popover/menu. */
@keyframes inline-select-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.inline-select-popover {
  border-radius: 5px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  background: linear-gradient(135deg, var(--color-popover-grad-a), var(--color-popover-grad-b), var(--color-popover-grad-a));
  background-size: 200% 200%;
  animation: inline-select-gradient 6s ease infinite;
}

.inline-select-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
}

.inline-select-option {
  border-radius: 3px;
  border: 1px solid var(--color-grid-border);
}
```

- [ ] **Step 3: Verifica tipi**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit`
Expected: nessun errore (componente non ancora usato da nessuno, ma deve compilare standalone).

- [ ] **Step 4: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add components/InlineSelectCell.tsx app/globals.css
git commit -m "Aggiunge componente generico InlineSelectCell (badge cliccabile con autosave)"
```

---

### Task 3: Wiring in `JobRow.tsx`

**Files:**
- Modify: `components/JobRow.tsx`

**Interfaces:**
- Consumes: `InlineSelectCell` e `InlineSelectOption` da Task 2 (`@/components/InlineSelectCell`), `updateJobStatusAction` da Task 1 (`@/lib/actions/jobs`).

- [ ] **Step 1: Importare il componente e la action**

In `components/JobRow.tsx`, riga 19, cambiare:

```ts
import { deleteJobFromListAction } from '@/lib/actions/jobs';
```

in:

```ts
import { deleteJobFromListAction, updateJobStatusAction } from '@/lib/actions/jobs';
```

e subito dopo l'import di `RowActionsCell` (riga 18) aggiungere:

```ts
import InlineSelectCell, { type InlineSelectOption } from '@/components/InlineSelectCell';
```

- [ ] **Step 2: Derivare le opzioni da `STATUS_LABEL`/`STATUS_BADGE`**

Subito dopo la definizione di `STATUS_BADGE` (righe 32-39), aggiungere:

```ts
const JOB_STATUS_OPTIONS: InlineSelectOption<JobStatus>[] = (Object.keys(STATUS_LABEL) as JobStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
  badgeClassName: STATUS_BADGE[value],
}));
```

- [ ] **Step 3: Sostituire il badge statico con `InlineSelectCell` quando `canUpdate`**

Alla riga 196-198, cambiare:

```tsx
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>{STATUS_LABEL[job.status]}</span>
      </div>
```

in:

```tsx
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        {canUpdate ? (
          <InlineSelectCell value={job.status} options={JOB_STATUS_OPTIONS} onSave={updateJobStatusAction.bind(null, job.id)} />
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>{STATUS_LABEL[job.status]}</span>
        )}
      </div>
```

Nota: il click sul badge di `InlineSelectCell` chiama `e.stopPropagation()` internamente (Task 2, `openPopover`), quindi non fa scattare anche `onClick={() => setModal('detail')}` della cella genitore.

- [ ] **Step 4: Verifica tipi e build**

Run: `cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app && npx tsc --noEmit && npm run build`
Expected: entrambi puliti, nessun errore.

- [ ] **Step 5: Verifica manuale**

Avviare il dev server (`npm run dev`), andare su `/dashboard/jobs` con un utente che ha permesso di update:
1. Cliccare il badge di stato di un job → si apre il popover con le 6 opzioni, quella corrente evidenziata.
2. Selezionare uno stato diverso → il popover si chiude, il badge cambia subito colore/testo con uno spinner sovrapposto, poi lo spinner sparisce.
3. Ricaricare la pagina → lo stato è rimasto quello nuovo (persistito).
4. Cliccare il badge e poi cliccare fuori dal popover (o premere Esc) → il popover si chiude senza cambiare nulla.
5. Con un utente senza permesso di update (es. ruolo dipendente su un job non assegnato a lui) → il badge resta lo `span` statico non cliccabile, comportamento identico a prima.

- [ ] **Step 6: Commit**

```bash
cd /Users/housedadasnc/Webapp/LNON/Dev/lnon-app
git add components/JobRow.tsx
git commit -m "Collega InlineSelectCell allo stato Job nella lista /dashboard/jobs"
```
