# Sotto-tab categoria su Lavori (Standard / Contratti Web / Conteggio Orario)

## Contesto

Oggi `/dashboard/jobs` distingue solo in modo binario e implicito i lavori "normali" da quelli generati dal Conteggio Orario, tramite un'unica icona toggle (`JobsSystemGeneratedToggle`) che passa `?system=1`. Non esiste alcuna vista dedicata ai lavori collegati a un Contratto (campo `Job.contractId`, oggi quasi mai popolato).

L'utente vuole ricalcare il pattern già usato in Contratti (sotto-categorie Web / Conteggio Orario) applicandolo a Lavori, ma come filtro interno alle pagine esistenti (Lista/Archivio/Cestino), non come nuovo asse di navigazione in sidebar — quell'asse resta quello di oggi (stato del lavoro nel ciclo di vita: attivo/archiviato/cestinato).

## Categorie e criterio

Nuovo query param `category`, tre valori, **`standard` come default quando assente**:

- **`standard`**: `is_system_generated = false` AND `contract_id` nullo — il grosso dei lavori (import storico, manuali).
- **`web`**: `is_system_generated = false` AND `contract_id` non nullo — lavori collegati a un Contratto. Oggi 0 righe (l'unico collegamento esistente era errato ed è stato scollegato manualmente), si popolerà quando i lavori verranno collegati ai contratti.
- **`hourly`**: `is_system_generated = true` — i lavori auto-generati dal Conteggio Orario (oggi 7, uno per contratto orario attivo). Sostituisce l'attuale `?system=1`.

## Modifiche

### 1. `lib/db.ts` — `getJobs()`
Sostituire il parametro `systemGenerated?: boolean` con `category?: 'standard' | 'web' | 'hourly'` (default `'standard'` se assente). La query applica:
- `standard` → `.eq('is_system_generated', false).is('contract_id', null)`
- `web` → `.eq('is_system_generated', false).not('contract_id', 'is', null)`
- `hourly` → `.eq('is_system_generated', true)`

Nessun'altra funzione in `lib/db.ts` chiama `getJobs` con `systemGenerated`, quindi il rename è sicuro (verificare comunque tutti i call site in fase di implementazione).

### 2. Nuovo componente `components/JobsCategoryTabs.tsx`
Client component, sostituisce `JobsSystemGeneratedToggle` (che viene rimosso). Tre pillole/segmenti "Standard", "Contratti Web", "Conteggio Orario": legge `category` dai search params (default `standard` se assente), scrive il nuovo valore via `router.push`, resettando `page` (stesso comportamento di reset paginazione del toggle attuale). Stile a pillole coerente con gli altri controlli della toolbar liste (non un vero `<Tabs>` di libreria, pattern coerente con `JobsSystemGeneratedToggle`/`AssignedToPicker`: bottoni con stato attivo evidenziato).

### 3. Pagine — lette il param, passato a `getJobs`, montato il componente
- **`app/dashboard/jobs/page.tsx`** (`JobsListSection`): legge `category` da `searchParams`, lo passa a `getJobs`, sostituisce `searchExtra={<JobsSystemGeneratedToggle .../>}` con `<JobsCategoryTabs active={category} />`.
- **`app/dashboard/jobs/archive/page.tsx`**: oggi non ha alcun filtro di categoria (implicitamente sempre `standard`, dato che `getJobs` senza `systemGenerated` filtrava già `is_system_generated=false` — ma includeva anche gli eventuali `contract_id` non nulli, quindi in pratica "standard ∪ web" di oggi). Aggiungere lettura di `category` dai search params e passarlo a `getJobs`; montare `JobsCategoryTabs` in cima alla pagina (non esiste oggi un punto equivalente a `searchExtra` di `ListNavigator` in questa pagina — verificare in implementazione se questa pagina usa `ListNavigator` o markup proprio).
- **`app/dashboard/jobs/trash/page.tsx`**: stesso trattamento di `archive/page.tsx`.

### Fuori scope
- Nessuna modifica a `navItems.ts` / sidebar: l'asse Lista/Archivio/Cestino resta quello di oggi, `category` è un filtro interno a ciascuna delle tre viste.
- Nessuna UI per collegare un job a un contratto (il `JobLinkButton`/flusso di collegamento contratto, se esiste, non è toccato da questo lavoro — la tab "Contratti Web" mostra semplicemente i job già collegati, qualunque sia il modo in cui vengono collegati).
- Nessuna migrazione DB: `contract_id` esiste già sullo schema `jobs`.

## Verifica

- `npx tsc --noEmit` + `npm run build`.
- Manuale: su `/dashboard/jobs`, `/dashboard/jobs/archive`, `/dashboard/jobs/trash` verificare che le 3 tab filtrino correttamente (Standard esclude i 7 conteggio-orario e gli eventuali web-linked; Conteggio Orario mostra solo quelli; Contratti Web mostra solo quelli con contratto collegato, oggi vuota) e che il parametro persista nella paginazione/ricerca.
