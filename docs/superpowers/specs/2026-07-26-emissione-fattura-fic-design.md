# Emissione fattura su Fatture in Cloud — Design

## Contesto

LNON gestisce oggi le fatture progetto (`ProjectInvoice`) solo come bozze interne: nessuna integrazione crea un documento reale su Fatture in Cloud (FIC). `lib/fattureincloud.ts` ha già OAuth, sync clienti/prodotti e lettura sola-lettura delle fatture FIC (`listAllFicInvoices`, usata per il match automatico storico). `generateFicInvoiceAction` in `lib/actions/projectInvoices.ts` è uno stub che ritorna sempre `success: false`. Il tipo `ProjectInvoice` (`lib/types.ts:224`) ha già il campo `ficInvoiceId?: number` predisposto ma mai popolato.

Questo design collega l'emissione reale: dal pulsante "Genera su FIC" (già presente ma disabilitato in `ProjectInvoiceRow.tsx`) si crea un documento fattura vero su Fatture in Cloud a partire dai dati della `ProjectInvoice`.

## Vincolo tecnico chiave

L'SDK FIC (`@fattureincloud/fattureincloud-ts-sdk`, `IssuedDocumentsApi.createIssuedDocument`) **non supporta la creazione di documenti in stato bozza**: ogni documento creato via API nasce già come fattura emessa e numerata definitivamente (endpoint `POST /c/{company_id}/issued_documents`). Non esiste un parametro "draft". Questo è stato verificato leggendo i modelli TypeScript dell'SDK (`create-issued-document-request.ts`, `issued-document.ts`) — non c'è alcun campo di stato bozza/emessa.

**Decisione conseguente**: accettiamo il vincolo. L'azione crea direttamente un documento definitivo, con una conferma esplicita obbligatoria prima dell'invio (non è un'operazione annullabile via API). Di conseguenza, alla riuscita, lo stato della `ProjectInvoice` passa immediatamente a `fatturata` (non ha senso lasciarla `da_fatturare` quando il documento fiscale reale esiste già).

## Flusso end-to-end

Punto di innesto: `generateFicInvoiceAction(id: string)` in `lib/actions/projectInvoices.ts`, oggi uno stub, diventa l'orchestratore. Riusa `requireAdmin()` già presente nello stesso file (blocca `dipendente`).

1. **Caricamento e guard di stato**: carica la `ProjectInvoice` per id. Se non trovata → errore. Se `status !== 'da_fatturare'` → errore ("Solo le fatture da fatturare possono essere generate su FIC."). Se `ficInvoiceId` è già valorizzato, l'azione richiede un flag esplicito `confirmOverwrite: boolean` passato dal chiamante (vedi UI, sezione conferma) — se assente, ritorna un esito speciale che dice alla UI di mostrare l'avviso di sovrascrittura invece di procedere.
2. **Risoluzione cliente FIC**: carica il `Client` collegato (`invoice.clientId`). Se `client.ficId` è già valorizzato, si usa quello. Altrimenti si chiama la funzione esistente `createFicClientFromLnonClient(client)` (`lib/fattureincloud.ts:114`) e si salva il risultato con `linkClientToFic(clientId, ficId)` (`lib/db.ts:1044`, già esistente). Se questa chiamata fallisce (errore di rete, dati cliente insufficienti per FIC), l'intera azione si interrompe qui e ritorna l'errore: nessun documento fattura viene creato, nessuno stato viene modificato.
3. **Risoluzione aliquota IVA FIC**: nuova funzione `resolveFicVatType(vatRate: number): Promise<number>` in `lib/fattureincloud.ts`, che usa `InfoApi.listVatTypes(companyId)` (endpoint `GET /c/{company_id}/info/vat_types`, già presente nell'SDK, mai wrappato oggi) per ottenere l'elenco dei vat type dell'account FIC connesso, e cerca il primo con `value === vatRate`. Se non trovato, errore esplicito: `` `Nessuna aliquota IVA del ${vatRate}% configurata su Fatture in Cloud.` ``. Nessun fallback silenzioso o creazione automatica di un nuovo vat type.
4. **Costruzione del documento**: nuova funzione `createFicInvoiceDocument(invoice: ProjectInvoice, ficClientId: number, vatTypeId: number): Promise<{ ficId: number; number: number; date: string }>` in `lib/fattureincloud.ts`, che riusa il pattern privato `getIssuedDocumentsApi()` già esistente (`lib/fattureincloud.ts:264`) e chiama `api.createIssuedDocument(companyId, { data: {...} })` con:
   - `type: 'invoice'`
   - `entity: { id: ficClientId }`
   - `date`: data odierna in formato `YYYY-MM-DD`
   - `items_list`: un elemento per ogni `invoice.lineItems[i]`, con `description: item.label`, `qty: 1`, `net_price: item.netAmount`, `vat: { id: vatTypeId }`
   Nessun invio email, nessuna allegazione: il documento viene solo creato su FIC.
5. **Persistenza esito**: se la chiamata FIC riesce, si aggiorna la `ProjectInvoice`:
   - `ficInvoiceId` = id del documento FIC creato
   - `invoiceNumber` = numero restituito da FIC
   - `invoiceDate` = data restituita da FIC
   - `status` = `'fatturata'`
   Nuova funzione `lib/db.ts`: `linkProjectInvoiceToFic(invoiceId: string, data: { ficInvoiceId: number; invoiceNumber: string; invoiceDate: Date }): Promise<ProjectInvoice>` — singolo `update` sulla riga `project_invoices`, stesso stile delle altre funzioni di update in quel file.
6. **Se la creazione del documento FIC fallisce** (dopo che il cliente è stato eventualmente creato/collegato al passo 2): l'errore viene propagato, la `ProjectInvoice` resta `da_fatturare` senza `ficInvoiceId`. Il collegamento cliente-FIC creato al passo 2, se avvenuto, resta valido e viene riusato al tentativo successivo (non è un problema, anzi evita di ricrearlo).

## Generazione singola (UI)

- **`ProjectInvoiceRow.tsx`**: il bottone "Genera su FIC" nel context-menu (oggi con badge "Presto", `lib/actions/projectInvoices.ts` linea che disabilita) si abilita. `handleGenerateFic` esistente chiama `generateFicInvoiceAction(invoice.id)`.
- **Conferma pre-generazione**: prima della chiamata server, si mostra un `DoubleConfirmModal` (componente già usato per eliminazioni, stesso pattern) con messaggio: primo step "Verrà creata una fattura definitiva e numerata su Fatture in Cloud. Procedere?", secondo step di conferma finale — coerente con la sensibilità dell'operazione (documento fiscale non annullabile via API).
- **Se `ficInvoiceId` è già presente** (rigenerazione): il primo step del `DoubleConfirmModal` cambia messaggio in "Questa fattura ha già un documento collegato su Fatture in Cloud (N. `<invoiceNumber>`). Generandone uno nuovo, il riferimento al documento precedente verrà sovrascritto in LNON (il vecchio documento resta comunque presente su FIC). Procedere?" — poi la action viene chiamata con `confirmOverwrite: true`.
- **`InvoicePreviewModal.tsx`**: stesso bottone "Genera su FIC" aggiunto nel footer/header del modale, stessa logica di conferma, per simmetria con "Vedi fattura" già presente ovunque.

## Generazione multipla (bulk)

Mirror strutturale di `archiveProjectInvoicesAction` + `InvoicesBulkBar` già esistenti per l'archiviazione bulk:

- Nuova azione `generateFicInvoicesBulkAction(ids: string[]): Promise<{ success: boolean; message: string; results: { id: string; success: boolean; message: string }[] }>` in `lib/actions/projectInvoices.ts`, che itera `ids` chiamando internamente la stessa logica di `generateFicInvoiceAction` per ciascuna (fatture con `ficInvoiceId` già presente vengono saltate con esito `success: false, message: 'Già generata, saltata (usa la generazione singola per sovrascrivere).'` — niente conferma di sovrascrittura in bulk, per evitare un'azione distruttiva silenziosa su più documenti insieme).
- `message` finale riassuntivo: `` `${N} generate su FIC, ${M} fallite.` `` (con dettaglio dei falliti disponibile via `results` per un'eventuale lista d'errore nella UI).
- Nuovo bottone "Genera su FIC" nella barra di selezione fatture esistente (stesso componente di `archiveProjectInvoicesAction`, verificare nome esatto file bulk bar in fase di piano), visibile solo se tutte le fatture selezionate sono `da_fatturare` senza `ficInvoiceId` (altrimenti disabilitato con tooltip esplicativo).
- Stessa conferma `DoubleConfirmModal` prima di procedere, con messaggio che riporta il conteggio: "Verranno create N fatture definitive e numerate su Fatture in Cloud. Procedere?".

## Permessi

Nessuna modifica alla matrice permessi: si riusa `requireAdmin()` già presente in `lib/actions/projectInvoices.ts`, che blocca il ruolo `dipendente`. Stesso comportamento sia per la generazione singola che bulk.

## Gestione errori

Ogni fallimento (sync cliente fallita, aliquota IVA non trovata, errore di rete/API FIC) produce un messaggio d'errore chiaro in italiano, mostrato via `notify()` (pattern esistente in tutte le action). Nessuno stato parziale viene lasciato sulla `ProjectInvoice`: o l'intera sequenza (cliente + documento + aggiornamento stato) riesce, o la fattura resta `da_fatturare` senza `ficInvoiceId`.

## Fuori scope (non ora)

- Numerazione/serie personalizzate, termini di pagamento, allegati, invio email al cliente dal lato FIC — il documento viene solo creato, la gestione successiva (invio, modifiche, note di credito) resta dentro FIC stesso.
- Sync di ritorno dello stato pagamento da FIC verso LNON (`paymentStatus`/`paidAt`) — resta come oggi, gestione manuale.
- Selezione multi-company — si usa sempre l'unica company già connessa via OAuth (`getValidAccessToken`).
- Un vero stato-lifecycle FIC (bozza/inviata/modificata/cancellata) lato LNON — il campo `ficInvoiceId` singolo basta per questo scope; un lifecycle più ricco resta backlog futuro, già annotato nel piano Conteggio Orario.

## File coinvolti

- `lib/fattureincloud.ts` — nuove funzioni `resolveFicVatType`, `createFicInvoiceDocument`.
- `lib/db.ts` — nuova funzione `linkProjectInvoiceToFic`.
- `lib/actions/projectInvoices.ts` — `generateFicInvoiceAction` da stub a implementazione reale, nuova `generateFicInvoicesBulkAction`.
- `components/ProjectInvoiceRow.tsx` — abilitazione bottone, conferma con `DoubleConfirmModal`.
- `components/InvoicePreviewModal.tsx` — aggiunta bottone "Genera su FIC".
- Barra di selezione bulk fatture (file esistente da identificare in fase di piano, mirror di `archiveProjectInvoicesAction`'s UI).

## Verifica

Nessun framework di test automatico nel progetto — gate: `npx tsc --noEmit` + `npm run build`. Verifica end-to-end manuale in dev (serve un account FIC sandbox/reale già collegato via OAuth, dato che l'azione chiama l'API reale): generare una fattura singola, verificare comparsa su FIC con numero/data corretti e righe corrette, verificare che lo stato LNON passi a `fatturata`, poi verificare il flusso bulk e il caso di rigenerazione con conferma di sovrascrittura.
