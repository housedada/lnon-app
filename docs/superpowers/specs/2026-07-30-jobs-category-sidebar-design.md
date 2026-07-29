# Categoria Lavori come sotto-voci di sidebar (come Contratti)

## Contesto

Il lavoro appena mergiato (`2026-07-30-jobs-category-tabs`) ha implementato la categorizzazione Standard/Contratti Web/Conteggio Orario come pillole *dentro* la pagina Lavori, filtro via query param. L'utente si aspettava invece la stessa UI di Contratti: **sotto-voci di sidebar**, ciascuna una route vera (`/dashboard/contracts` per Web, `/dashboard/contracts/hourly` per Conteggio Orario), non un controllo in pagina.

Questa spec corregge la UI per allinearla a Contratti, riusando l'infrastruttura dati già costruita (`getJobs({ category })`, `JobsCategoryTabs`, tipo `JobCategory`) — non serve toccare `lib/db.ts` né i criteri delle 3 categorie, già corretti e verificati.

## Il problema del doppio asse

Lavori ha oggi due assi di sotto-voci potenziali: stato (Lista/Archivio/Cestino, esistente) e categoria (Standard/Web/Conteggio Orario, nuovo). Contratti ne ha uno solo (categoria) e non ha affatto Archivio/Cestino. Decisione (confermata dall'utente): **la categoria sostituisce Lista/Archivio/Cestino come sotto-voci di sidebar**. Archivio e Cestino restano raggiungibili dalle icone già presenti in testa alla pagina Lavori (non cambia nulla lì), ma escono dalla sidebar.

## Modifiche

### 1. `lib/navItems.ts`
Sotto-voci di `jobs` diventano:
```ts
subItems: [
  { label: 'Standard', href: '/dashboard/jobs', storageValue: 'standard' },
  { label: 'Contratti Web', href: '/dashboard/jobs/web', storageValue: 'web' },
  { label: 'Conteggio Orario', href: '/dashboard/jobs/hourly', storageValue: 'hourly' },
],
```
(rimuove le voci Lista/Archivio/Cestino esistenti, stesso `viewStorageKey: 'jobs-tab'`).

### 2. Estrazione della lista in un componente condiviso
`app/dashboard/jobs/page.tsx` oggi contiene una funzione interna `JobsListSection` che legge `category` da `searchParams`. Va estratta in `components/JobsListSection.tsx` (server component), che riceve `category` come **prop fissa** invece di leggerla dai search params, più un prop `basePath` (per passare a `ListNavigator`). Rimuove `JobsCategoryTabs` da `searchExtra` (non serve più: la categoria è ormai decisa dalla route, non da un filtro in pagina).

### 3. Tre route sottili, una per categoria
- `app/dashboard/jobs/page.tsx` — categoria `standard` (comportamento di oggi meno le pillole), `RememberRoute` con `tabKey="standard"`.
- `app/dashboard/jobs/web/page.tsx` — nuova, categoria `web`, stesso impianto (fetch client/contract/product/users, header con New/Sync/Archivio/Cestino, `JobsListSection`), `tabKey="web"`.
- `app/dashboard/jobs/hourly/page.tsx` — nuova, categoria `hourly`, stesso impianto, `tabKey="hourly"`.

Ogni route fa il proprio fetch dei dati (client options, ecc.), stesso pattern di `app/dashboard/contracts/page.tsx` vs `app/dashboard/contracts/hourly/page.tsx` (pagine indipendenti, non un layout condiviso con dati passati giù).

### 4. Archivio e Cestino
Restano dove sono (`/dashboard/jobs/archive`, `/dashboard/jobs/trash`), continuano a usare `JobsCategoryTabs` per il filtro interno (già implementato, resta valido — sono viste senza un proprio posto in sidebar, il filtro in pagina lì ha senso). Rimuovere solo le chiamate a `RememberRoute` in quelle due pagine (tabKey `archive`/`trash` non corrisponde più a nessuna sotto-voce di sidebar, quindi non ha più effetto utile).

### Fuori scope
- Nessuna modifica a `lib/db.ts`, `JobCategory`, criteri delle categorie, o `JobsCategoryTabs.tsx` (riusato as-is per Archivio/Cestino).
- Nessuna modifica al fix già fatto sul redirect post-salvataggio (`?category=web` per job con contratto) — resta valido, il redirect ora porta a `/dashboard/jobs/web?saved=1` invece di `/dashboard/jobs?saved=1&category=web` (aggiornare la action di conseguenza).

## Verifica
- `npx tsc --noEmit` + `npm run build`.
- Manuale: sidebar mostra le 3 sotto-voci sotto Lavori; cliccare ciascuna porta alla route corretta con i job giusti; Archivio/Cestino restano raggiungibili dalle icone e mostrano ancora le pillole categoria; salvare un job con un contratto collegato redirige a `/dashboard/jobs/web`.
