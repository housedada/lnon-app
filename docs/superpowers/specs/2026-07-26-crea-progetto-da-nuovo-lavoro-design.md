# Toggle "crea anche progetto" nella creazione lavoro — Design

## Contesto

Oggi creare un lavoro (`Job`) e poi iniziare a lavorarci (`Project` + sottotask) sono tre passaggi separati: `/dashboard/jobs/new` → salva → dalla lista lavori si clicca "Crea progetto" (apre `CreateProjectFromJobModal`, esistente) → poi si va nella board Task per aggiungere i sottotask. Questo design collassa i tre passaggi in un unico flusso guidato, innescato da un toggle nel form del lavoro.

## Flusso

1. **Form Nuovo Lavoro** (`components/JobForm.tsx`): un toggle "Crea anche un progetto collegato", **acceso di default**, posizionato accanto al bottone "Salva". Campo `name="createProject"` (checkbox), incluso solo nel form di creazione (`app/dashboard/jobs/new/page.tsx`) — non ha senso nel form di modifica di un lavoro esistente (`JobForm` è già condiviso tra i due, quindi il toggle si mostra solo quando `job` prop è assente, cioè creazione).
2. **`createJobAction`** (`lib/actions/jobs.ts`): dopo aver creato il lavoro, legge `formData.get('createProject')`. Se presente/truthy, redirect a `/dashboard/jobs?createProject=<jobId>` invece del solito `/dashboard/jobs?saved=1`.
3. **Lista Lavori** (`app/dashboard/jobs/page.tsx`): nuovo componente client `JobCreateProjectFlow`, montato sempre (come già `NotifyFromQuery`), che osserva il query param `createProject`. Se presente, cerca il lavoro corrispondente tra quelli già caricati nella pagina (la lista lavori appena renderizzata include già il lavoro appena creato, in cima per ordinamento data) e apre **step 1**: `CreateProjectFromJobModal` (esistente, invariato) precompilato con titolo e assegnatario del lavoro.
4. **Step 1 → Step 2**: `createProjectFromJobAction` (`lib/actions/projects.ts`) viene esteso per ritornare anche `projectId` nel risultato (`{ success: boolean; message: string; projectId?: string }`, additivo, nessun consumer esistente rompe perché il campo è opzionale). Alla conferma riuscita, `JobCreateProjectFlow` non chiude più il flusso: passa allo **step 2**, aprendo `ProjectDetailModal` (esistente, lo stesso della card progetto in Task) per il progetto appena creato, con `initialTasks: []` — l'utente aggiunge subito i sottotask con la stessa interfaccia (`ProjectTaskList`) già usata ovunque nell'app.
5. **Chiusura**: chiudendo `ProjectDetailModal` (step 2) o annullando `CreateProjectFromJobModal` (step 1), `JobCreateProjectFlow` ripulisce il query param dall'URL via `router.replace` (stesso meccanismo già usato da `NotifyFromQuery`), così un refresh della pagina non riapre il flusso.

## Permessi

`JobCreateProjectFlow` viene montato solo se l'utente ha già il permesso di creare progetti (`canCreateProjects`, già calcolato in `app/dashboard/jobs/page.tsx` per il bottone "Crea progetto" nelle righe esistenti) — se un utente senza quel permesso arriva comunque con `?createProject=<jobId>` in URL (es. link condiviso), il param viene semplicemente ripulito senza aprire nulla, nessun errore visibile. `canManageInvoices` per `ProjectDetailModal` (necessario per mostrare il bottone "segna completato") si calcola con lo stesso criterio già usato altrove nell'app: `role === 'superadmin' || role === 'admin'`.

## Cosa NON cambia

- `CreateProjectFromJobModal`, `CreateProjectFromJobButton`, `ProjectDetailModal` restano invariati e continuano a funzionare come oggi in tutti gli altri punti dell'app (righe Lavori, board Task) — l'unica modifica è il nuovo campo opzionale `projectId` nel ritorno di `createProjectFromJobAction`.
- Il form di modifica di un lavoro esistente non mostra il toggle (ha senso solo in creazione).
- Nessuna modifica allo schema del database: `createDbProject` esiste già e ritorna il `Project` creato con `id`.

## File coinvolti

- `components/JobForm.tsx` — aggiunta del toggle, visibile solo quando `!job` (creazione).
- `lib/actions/jobs.ts` — `createJobAction` legge il flag e sceglie il redirect.
- `lib/actions/projects.ts` — `createProjectFromJobAction` ritorna anche `projectId`.
- `app/dashboard/jobs/page.tsx` — monta `JobCreateProjectFlow` passandogli i dati già disponibili nella pagina (lista lavori, `userOptions`, `canCreateProjects`, `canManageInvoices`).
- `components/JobCreateProjectFlow.tsx` (nuovo) — orchestratore client dei due step, mirror del pattern `NotifyFromQuery` per la gestione del query param.

## Verifica

Nessun framework di test automatico — gate: `npx tsc --noEmit` + `npm run build`. Verifica end-to-end manuale: creare un lavoro con il toggle acceso → atterrare sulla lista Lavori → vedere subito il mini-modale di conferma progetto → confermare → vedere subito il modale progetto con la lista task vuota, pronto per aggiungerne → chiudere → verificare che il progetto compaia nella board Task con i sottotask aggiunti. Ripetere con il toggle spento e verificare che il comportamento resti quello attuale (solo `?saved=1`, nessun modale).
