# Report — Approfondimenti (rischio credito, top clienti, funnel, scadenze provider) — Design

## Contesto

La pagina Report (`app/dashboard/reports/page.tsx`) mostra oggi `EconomicOverviewWidget`: Entrate attuali, Potenziale, Uscite, Margine, più una tabella Lavori sotto. Questo design aggiunge quattro approfondimenti, tre derivati dagli stessi dati già calcolati da `getJobsForecast` (rischio credito, top clienti, funnel di conversione) e uno nuovo (scadenze provider in arrivo, indipendente dall'anno fiscale selezionato).

## 1. Rischio credito (fasce di aging)

Sotto la riga "Potenziale" in `EconomicOverviewWidget`. Riusa esattamente le fatture non riscosse già raccolte per `totals.fatturatoNonRiscosso` (stesso perimetro: fatture `fatturata` di job dell'anno fiscale selezionato, senza `paid_at`), quindi la query esistente in `getJobsForecast` va estesa a selezionare anche `invoice_date`, `created_at`, `client_name`, `invoice_number`, `id` (non solo `net_amount`/`paid_at`).

Tre fasce, calcolate da `invoiceDate` (fallback `createdAt` se assente) rispetto a oggi:
- 0-30 giorni
- 30-60 giorni
- oltre 60 giorni

Sotto le tre fasce, le **5 fatture non riscosse più vecchie** (ordinate per data crescente), ciascuna con cliente, importo, giorni trascorsi. In fondo, un link "Vai a tutte le fatture non riscosse" verso `/dashboard/invoices?unpaid=1&jobFiscalYear=<anno>`.

## 2. Top 5 clienti per fatturato

Nuova sezione, subito dopo Potenziale/Rischio credito. Raggruppa le stesse fatture `fatturata` job-scoped dell'anno (quelle già usate per `totals.fatturato`) per cliente (chiave `clientId ?? clientName`, etichetta `clientName`), ordina per importo decrescente, mostra le prime 5.

## 3. Funnel di conversione (per conteggio lavori)

Stessa area di Top clienti. Ogni lavoro dell'anno fiscale (esclusi i `cancelled`, stesso set già iterato in `getJobsForecast`) finisce in **esattamente un bucket**:
- **Fatturato**: se ha almeno una fattura `fatturata` collegata (`invoicedAmount > 0`), a prescindere dallo stato del lavoro.
- Altrimenti, bucket della sua categoria attuale: **Potenziale** / **Preventivato** / **Confermato**.

Percentuale di conversione = conteggio bucket Fatturato ÷ totale lavori dell'anno (somma dei 4 bucket) × 100.

## 4. Scadenze provider in arrivo

Nuova sezione dopo "Uscite". **Non** filtrata per l'anno fiscale selezionato nel Report (è una scadenza di calendario reale, non legata al periodo del report): contratti con `status = 'attivo'` e `providerExpiryDate` compreso tra oggi e oggi+30 giorni, ordinati per data crescente. Ogni riga: cliente, provider, piano, data di scadenza, giorni rimanenti.

## Modifiche dati

### `lib/db.ts`

- **`getJobsForecast`**: la query fatture esistente (righe ~533-545) si estende per selezionare anche `id, invoice_date, created_at, client_id, client_name, invoice_number` oltre a `net_amount`/`paid_at`. Nel loop già esistente sui job si accumulano, oltre ai totali attuali:
  - `creditRisk.buckets`: `{ label: '0-30' | '30-60' | 'oltre 60'; amount: number }[]`
  - `creditRisk.topUnpaid`: le 5 fatture non riscosse più vecchie (id, clientName, invoiceNumber, invoiceDate effettiva usata, amount, giorni)
  - `topClients`: `{ clientName: string; amount: number }[]` (prime 5)
  - `funnel`: `{ potenziale: number; preventivato: number; confermato: number; fatturato: number; total: number }` (conteggi lavori)

  Tutto calcolato dalla stessa iterazione già presente, nessuna query aggiuntiva.

- **Nuova funzione `getUpcomingProviderExpirations(days: number): Promise<Contract[]>`**: `contracts` con `status = 'attivo'`, `deleted_at is null`, `provider_expiry_date` tra oggi e oggi+`days` giorni, ordinati per `provider_expiry_date` crescente. Riusa il mapping `contractRowToContract` già esistente nel file.

- **`getProjectInvoices`**: due nuovi filtri opzionali nell'oggetto `filters`:
  - `unpaid?: boolean` — aggiunge `.eq('status', 'fatturata').is('paid_at', null)` alla query.
  - `jobFiscalYear?: number` — risolve prima gli id dei job con quel `fiscal_year` (query separata su `jobs`, stesso pattern già usato in `getJobsForecast`), poi filtra `.in('job_id', jobIds)`.

### `lib/types.ts`

Nessuna modifica: `Contract`, `ProjectInvoice` hanno già tutti i campi necessari (`providerExpiryDate`, `invoiceDate`, `paidAt`, `clientId`, `clientName`).

## UI

### `components/EconomicOverviewWidget.tsx`

- Nuovo blocco "Rischio credito" sotto la sezione Potenziale esistente: 3 tile (una per fascia, colore che si scurisce dal grigio chiaro al rosso man mano che invecchia), poi una piccola lista (non tile-grid, righe semplici testo) delle 5 fatture più vecchie, poi il link.
- Nuova riga a due colonne "Top clienti" + "Funnel di conversione" subito dopo, stesso stile card-shadow/border-grid-border delle sezioni esistenti.
- Nuovo blocco "Scadenze provider" dopo la sezione Uscite: lista righe (non tile), o un semplice elenco se vuoto mostra "Nessuna scadenza nei prossimi 30 giorni".

Tutti i nuovi importi/percentuali usano gli stessi helper `formatExact`/pattern colore già presenti nel file (`FATTURATO_COLOR`, `USCITE_COLOR`, ecc. — nuovi colori solo se un bucket lo richiede, es. rosso per "oltre 60 giorni").

### `app/dashboard/invoices/page.tsx`

- `SearchParams` guadagna `unpaid?: string` e `jobFiscalYear?: string`.
- `InvoicesListSection` passa `unpaid: params.unpaid === '1'` e `jobFiscalYear: params.jobFiscalYear ? Number(params.jobFiscalYear) : undefined` a `getProjectInvoices`.
- Quando `unpaid === '1'`, una riga di testo sopra la lista (sotto l'header, sopra `ListNavigator`) indica il filtro attivo: "Filtro: fatture non riscosse{jobFiscalYear ? ' del ' + anno : ''} — Rimuovi filtro" con link che punta a `/dashboard/invoices` (nessun query param). Nessun nuovo componente condiviso, JSX inline nella pagina.
- La paginazione via `ListNavigator` preserva automaticamente `unpaid`/`jobFiscalYear` nell'URL (usa già `new URLSearchParams(searchParams.toString())` internamente), nessuna modifica a `ListNavigator` necessaria.

## Fuori scope

- Nessuna UI di filtro manuale "non riscosse" nella pagina Fatture (solo raggiungibile via link dal Report) — se in futuro serve un filtro esplorabile manualmente, sarà un design a parte.
- Nessuna azione di sollecito/promemoria automatico sulle fatture in ritardo — solo visualizzazione.
- Le scadenze provider mostrano solo contratti `attivo`; contratti `da_definire`/`disattivo` restano esclusi anche se hanno una data di scadenza valorizzata.

## Verifica

Nessun framework di test automatico — gate: `npx tsc --noEmit` + `npm run build`. Verifica manuale: aprire `/dashboard/reports`, cambiare anno fiscale e verificare che rischio credito/top clienti/funnel si aggiornino coerentemente con "Fatturato lavori"; cliccare il link rischio credito e verificare che la lista Fatture mostri solo le non riscosse dell'anno con il filtro visibile e rimovibile; verificare le scadenze provider con un contratto di test la cui `providerExpiryDate` cada entro 30 giorni.
