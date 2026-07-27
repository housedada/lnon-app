# Colonna "Sync sottovoci" in Fatture — Design

## Contesto

La sincronizzazione delle sottovoci FIC (appena implementata) sostituisce silenziosamente `lineItems` senza lasciare traccia visibile di *quando* (o *se*) una fattura è stata sincronizzata. Per verificare che tutte le fatture collegate a FIC siano state sincronizzate correttamente (e confrontarle con l'export storico), serve una colonna dedicata nella lista Fatture.

## Modifiche

**Schema** (`_mat/2026-07-27-sync-sottovoci-migration.sql`, da eseguire manualmente su Supabase): `ALTER TABLE project_invoices ADD COLUMN line_items_synced_at TIMESTAMPTZ;` — nullable, nessun default, nessun impatto sulle righe esistenti.

**Tipi**: `ProjectInvoice.lineItemsSyncedAt?: Date` (`lib/types.ts`).

**`lib/db.ts`**:
- `projectInvoiceRowToProjectInvoice` legge `line_items_synced_at`.
- `updateProjectInvoiceLineItems` (usata solo dalla sincronizzazione) imposta `line_items_synced_at = now()` insieme a `line_items` in un unico update — ogni sincronizzazione riuscita di una fattura aggiorna il timestamp.

**UI — `app/dashboard/invoices/page.tsx` + `components/ProjectInvoiceRow.tsx`**: nuova colonna "Sync sottovoci", ultima colonna dati (dopo "Creata il"), con tre stati mutuamente esclusivi:
- Nessun `ficInvoiceId` → badge grigio "Non collegata a FIC" (non sincronizzabile, non è un'anomalia).
- `ficInvoiceId` presente ma `lineItemsSyncedAt` assente → badge ambra "Non sincronizzato".
- `ficInvoiceId` e `lineItemsSyncedAt` presenti → badge verde "Sincronizzato il {data}".

## Fuori scope

- Nessun filtro di lista per stato sync (solo colonna informativa, per ora).
- Nessuna azione di sync per singola fattura dalla riga — resta solo il bottone bulk su Impostazioni FIC.

## Verifica

`npx tsc --noEmit` + `npm run build`. Verifica manuale: eseguire la migrazione, cliccare "Sincronizza sottovoci da FIC", verificare che tutte le fatture con un documento FIC collegato passino a "Sincronizzato il {oggi}" e che il conteggio combaci con quello riportato dal bottone di sync.
