# Sincronizzazione sottovoci FIC + pannello "Fatturato per prodotto" — Design

## Contesto

Il Report (`/dashboard/reports`) mostra oggi Entrate attuali, Potenziale, Rischio credito, Top clienti, Funnel, Uscite, Scadenze provider, Margine. Manca una vista per prodotto. Le fatture generate/importate da Fatture in Cloud (FIC) hanno realmente sottovoci per prodotto (`items_list`, ciascuna con `product_id`), ma oggi LNON non le scarica: `ProjectInvoice.lineItems` locale è solo `{ label, netAmount }`, senza legame a un prodotto — anche per fatture che su FIC hanno 3+ sottovoci reali (es. "fattura storica 136").

Questo design aggiunge: (1) una sincronizzazione manuale che scarica le sottovoci reali da FIC e le salva localmente con il prodotto collegato, (2) un pannello nel Report che mostra il fatturato aggregato per prodotto.

## 1. Modello dati

`ProjectInvoiceLineItem` (`lib/types.ts`) guadagna un campo opzionale:

```typescript
export interface ProjectInvoiceLineItem {
  label: string;
  netAmount: number;
  productId?: string;
}
```

Retrocompatibile: le fatture con `lineItems` non ancora sincronizzate (o le cui sottovoci non hanno un prodotto FIC riconosciuto) restano semplicemente senza `productId` su quella voce — finiscono nel bucket "Non categorizzato" nel pannello, senza sparire dal totale.

## 2. Sincronizzazione sottovoci da FIC

**`lib/fattureincloud.ts`** — nuova funzione `getFicIssuedDocumentItems(ficInvoiceId: number): Promise<{ description: string; netAmount: number; ficProductId?: number }[]>`, che riusa l'helper privato esistente `getIssuedDocumentsApi()` e chiama `api.getIssuedDocument(companyId, ficInvoiceId)`, mappando `response.data.data?.items_list ?? []` (ogni item: `description`, `net_price`, `product_id`).

**`lib/db.ts`**:
- Nuova funzione `getProjectInvoicesWithFicId(): Promise<{ id: string; ficInvoiceId: number }[]>` — mirror di `getProjectInvoicesWithNumber` già esistente, filtra `fic_invoice_id is not null` e `deleted_at is null`.
- Nuova funzione `updateProjectInvoiceLineItems(id: string, lineItems: ProjectInvoiceLineItem[]): Promise<void>` — singolo update sulla colonna `line_items`.
- Il matching prodotto FIC → prodotto locale riusa `getAllProductNames`-like lookup: nuova funzione (o estensione di una esistente) che ritorna `Map<number, string>` da `fic_id` locale a `id` locale (i prodotti hanno già `ficId?: number` in `lib/types.ts`).

**`lib/actions/fic.ts`** — nuova azione `syncInvoiceLineItemsFromFicAction(): Promise<{ synced: number; errors: number }>`, protetta da `requireSuperadmin()` (stesso helper già presente nel file, stesso livello di `bulkMatchInvoicesAction`):
1. Carica tutte le `ProjectInvoice` con `ficInvoiceId` (via `getProjectInvoicesWithFicId`) e la mappa prodotti FIC→locale.
2. Per ciascuna, chiama `getFicIssuedDocumentItems`; se fallisce (rete, invoice cancellata su FIC, ecc.) incrementa `errors` e continua con la successiva (stesso stile tollerante-agli-errori di `bulkMatchInvoicesAction`, nessun abort totale).
3. Costruisce le nuove `lineItems` (una per sottovoce FIC: `label = description`, `netAmount = net_price`, `productId` = match locale se `product_id` è mappato, altrimenti assente) e le salva con `updateProjectInvoiceLineItems`.
4. Ritorna il riepilogo; `revalidatePath('/dashboard/reports')` e `/dashboard/invoices`.

**UI**: nuovo `components/SyncInvoiceLineItemsButton.tsx`, mirror strutturale di `components/BulkMatchInvoicesButton.tsx` (stesso `useTransition`/`notify`/`router.refresh`), aggiunto in `app/dashboard/settings/fic/page.tsx` accanto a `BulkMatchInvoicesButton`.

## 3. Calcolo del breakdown per prodotto

**`lib/db.ts`, `getJobsForecast`**: la query fatture già esistente (usata anche per rischio credito/top clienti/funnel) guadagna una colonna in più nel `select`: `line_items`. Nella stessa iterazione già presente, per ogni fattura si scorrono le sue `lineItems`: se una voce ha `productId`, il suo `netAmount` si accumula in una mappa `amountByProduct` chiave `productId`; se non ha `productId`, si accumula in un bucket separato `"non_categorizzato"`. Nessuna query aggiuntiva oltre al lookup nomi prodotto (`getAllProductNames`, chiamata una volta, stesso pattern già usato in `getProductColorsForJobs`).

```typescript
export interface JobsForecastProductBreakdown {
  productId: string | null; // null = "Non categorizzato"
  productName: string;
  amount: number;
}
```

`JobsForecastResult` guadagna `productBreakdown: JobsForecastProductBreakdown[]`, ordinato per importo decrescente, "Non categorizzato" (se presente) sempre in fondo indipendentemente dall'importo.

## 4. UI Report

Nuovo componente `components/ProductBreakdownSection.tsx`: sezione a tutta larghezza, titolo "Fatturato per prodotto {anno}", griglia `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8` (una tessera per prodotto, nome + importo, stesso stile `card-shadow`/`border-grid-border`/`detail-label` delle altre sezioni). Se `productBreakdown` è vuoto, messaggio "Nessuna sottovoce sincronizzata da Fatture in Cloud." Posizionata subito dopo la riga Top clienti/Funnel in `EconomicOverviewWidget.tsx`.

## Fuori scope

- Nessuna sincronizzazione automatica al momento della generazione fattura da LNON (`generateFicInvoiceAction`) — resta manuale via il nuovo bottone, coerente con la scelta dell'utente.
- Nessun re-tentativo automatico per le fatture in errore — un nuovo click sul bottone riprova tutte (idempotente, sovrascrive sempre le `lineItems` correnti con l'ultimo stato FIC).
- Nessuna UI dedicata per il caso "prodotto FIC non mappato": l'utente ha confermato che nella pratica non dovrebbe verificarsi; il bucket "Non categorizzato" resta comunque come rete di sicurezza silenziosa (nessun avviso/errore mostrato).

## Verifica

Nessun framework di test automatico — gate: `npx tsc --noEmit` + `npm run build`. Verifica manuale: su Impostazioni FIC, cliccare "Sincronizza sottovoci da FIC" con almeno una fattura reale a più sottovoci (es. la "fattura storica 136" citata), verificare il riepilogo (`sincronizzate`/`errori`); aprire `/dashboard/invoices`, verificare che l'anteprima di quella fattura mostri ora le sottovoci reali; aprire `/dashboard/reports`, verificare che il pannello "Fatturato per prodotto" mostri gli importi coerenti con quella fattura.
