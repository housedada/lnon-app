# Overview Lavori (previsionale) — Design

Primo sotto-progetto del "Piano Economico Generale": una vista che aggrega i Lavori
(Jobs) per anno di competenza, mostrando quanto valore è potenziale, preventivato,
confermato e già fatturato, insieme alle spese fornitori sostenute per progetto.

Questo è il pezzo A di un lavoro più ampio composto da 4 sotto-progetti indipendenti:

- **A. Overview Lavori (previsionale)** — questo documento.
- **B. Spese Fisse** — sotto-pagina di Reports, costi fissi mensili/annuali inseriti
  manualmente da Admin (Commercialista, Attrezzatura, Telefono, Buoni Pasto, ecc.).
- **C. Spese fornitori per Job** — incluso in questo documento (campo singolo).
- **D. Piano Economico Generale** — vista finale che combina A+B con Manutenzioni Web
  e Conteggio Orario (da Contratti) in un bilancio previsionale unico.

## Contesto di riferimento

Il file `_mat/10-riferimento-bilancio-progetti.xlsx` è il vecchio strumento Excel che
questo modulo sostituisce. Il foglio "Progetti" ha colonne: Cliente, Progetto,
Descrizione, Importo Confermato, Spese Fornitori, Importo Preventivato, Spese
Preventivato, Data inizio, Stato, Fatturato, Note. Il foglio "Bilancio" aggrega
Costi Fissi + Costi Progetti + Costi Manutenzioni contro Fatturato Progetti +
Fatturato Manutenzioni + Fatturato Conteggio Orario in un "Bilancio Previsionale".

## Modifiche al modello dati

### Job (lib/types.ts, tabella `jobs`)

Due nuovi campi:

- `fiscalYear: number` — anno di competenza economica del lavoro. Selezionato
  manualmente in creazione/modifica del Job, non derivato da `startDate`,
  `createdAt` o altre date. Obbligatorio per i nuovi lavori; per lo storico
  importato va valorizzato in migrazione (stesso anno usato nell'import
  2026/2025/2024).
- `supplierCost?: number` — spesa fornitori/sottofornitori sostenuta per questo
  lavoro, importo singolo (non itemizzato). Per lo storico non viene recuperato
  (i dati Excel storici sulle spese sono inaffidabili): resta vuoto/0. In futuro
  si potrà evolvere verso un elenco di spese per Job (fuori scope qui).

### Project (lib/types.ts, tabella `projects`)

- Rimozione del campo `budgetShare` (numero, percentuale sul budget del job) e
  della validazione che impone che la somma dei progetti attivi di un job dia
  100. Vanno rimossi: colonna DB, campo tipo TypeScript, validazioni in azioni/
  form, visualizzazione in UI. I job possono continuare ad avere più progetti
  collegati, semplicemente senza più un peso percentuale associato.

### ProjectInvoice — nessuna modifica

Le fatture reali di un Job sono già modellate correttamente da `ProjectInvoice`
(collegata via `jobId`, indipendente dallo `status` del Job, con `netAmount`,
`status` `fatturata`/`da_fatturare`/`annullata`/`accorpata`). Lo storico 2024-2026
è già importato come record `ProjectInvoice` reali. Il "fatturato effettivo" di
un lavoro/anno si calcola sommando `netAmount` delle `ProjectInvoice` collegate
con `status = 'fatturata'`. I campi singoli legacy su Job (`invoiceNumber`,
`invoiceNetAmount`, ecc.) restano solo come residuo dell'import storico e non
vengono usati da questa nuova vista.

## Categorie economiche (derivate da JobStatus, nessun nuovo campo di stato)

| JobStatus | Categoria economica |
|---|---|
| `draft` | Potenziale |
| `pending_approval` | Preventivato (non confermato) |
| `approved`, `in_progress`, `completed` | Confermato |
| `cancelled` | Escluso da tutti i totali |

Il valore usato per Potenziale/Preventivato/Confermato è `estimatedBudget` del Job
(eventualmente `actualBudget` se valorizzato per i lavori completati — vedi Task
di implementazione per la scelta finale del campo da sommare per stato).

## Vista

Nuova pagina `app/dashboard/reports/lavori/page.tsx`, raggiunta come sotto-sezione
di Reports (che oggi è un placeholder "Coming Soon").

- Selettore anno (`fiscalYear`), default anno corrente.
- Cards di riepilogo in cima, per l'anno selezionato:
  - Totale Potenziale
  - Totale Preventivato
  - Totale Confermato
  - Totale Fatturato (somma `ProjectInvoice.netAmount`, status `fatturata`, per i
    job dell'anno)
  - Totale Spese Fornitori (somma `Job.supplierCost` per i job dell'anno)
- Tabella dettaglio dei lavori dell'anno selezionato, colonne: Cliente, Lavoro,
  Categoria/Stato, Budget stimato, Spese fornitori, Fatturato effettivo, Margine
  (Fatturato − Spese fornitori).
- Riuso di componenti/stile già presenti nella lista Jobs esistente
  (`app/dashboard/jobs/page.tsx`) dove applicabile (badge di stato, formattazione
  valuta, tabella).

## Permessi

Segue lo stesso livello di accesso già in uso per Reports/dati economici sensibili
(da confermare in fase di piano guardando `lib/permissions.ts`, presumibilmente
riservato ad admin/superadmin, escludendo `dipendente`).

## Fuori scope (rimandato a B, C evoluto, D)

- Spese Fisse manuali (Commercialista, Attrezzatura, Telefono, Buoni Pasto, ecc.)
- Manutenzioni Web (esiste già colonna dedicata da integrare in D)
- Conteggio Orario da Contratti (nuova sottosezione di Contratti, non ancora
  progettata)
- Bilancio previsionale aggregato finale (Piano Economico Generale, D)
- Spese fornitori itemizzate (elenco multiplo per Job, evoluzione futura del
  campo singolo `supplierCost`)
