# Spese Fisse — Design

Secondo sotto-progetto del "Piano Economico Generale" (vedi
`docs/superpowers/specs/2026-07-25-overview-lavori-design.md` per il contesto
completo e la scomposizione in sotto-progetti A-D). Questo documento copre il
sotto-progetto **B**: gestione manuale dei costi fissi aziendali (Commercialista,
Attrezzatura, Telefono, Buoni Pasto, ecc.), replica della sezione "Passività -
Spese Fisse" del vecchio Excel (`_mat/10-riferimento-bilancio-progetti.xlsx`).

## Modello dati

### `FixedExpenseCategory` (nuova entità, tabella `fixed_expense_categories`)

```typescript
export interface FixedExpenseCategory {
  id: string;
  label: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

Le categorie sono condivise tra tutti gli anni (non sono per-anno). L'elenco è
gestito da UI (non un enum fisso nel codice): l'Admin può **aggiungere** nuove
categorie in qualsiasi momento; **solo il superadmin può eliminarle** (soft
delete via `deletedAt`), per evitare di corrompere dati storici già inseriti da
altri.

Seed iniziale (da eseguire nella migrazione, stesse voci dell'Excel di
riferimento, foglio "2026 • Bilancio"):

1. Costo del personale
2. Commercialista
3. Attrezzatura
4. Telefono
5. Buoni Pasto
6. Spese studio (affitto + spese)
7. Welfare
8. Rimborsi Chilometrici
9. Ammortamenti

### `FixedExpenseEntry` (nuova entità, tabella `fixed_expense_entries`)

```typescript
export interface FixedExpenseEntry {
  id: string;
  categoryId: string;
  fiscalYear: number;
  amount: number;
  isActive: boolean; // default true
  updatedBy: string;
  updatedAt: Date;
  // Popolato solo in lettura, se collegato
  categoryLabel?: string;
}
```

Una entry rappresenta l'importo di una categoria per un anno specifico.
Vincolo di unicità logico: al più una entry per coppia `(categoryId,
fiscalYear)` — l'upsert (Task di implementazione) deve rispettarlo. Se per una
categoria non esiste ancora una entry per l'anno selezionato, il valore
mostrato in UI è 0 (nessuna riga da creare finché l'Admin non inserisce un
importo).

`isActive` esclude l'importo dal totale della Overview Spese Fisse **senza
cancellarlo**: l'ambito è la singola entry (categoria + anno), non l'intera
categoria — si può disattivare solo l'anno 2025 di "Attrezzatura" lasciando
attivo il 2026. Le entry disattivate restano visibili in tabella (importo in
stile attenuato/barrato) per trasparenza, semplicemente non contribuiscono al
totale.

## Permessi

Nuova risorsa `fixed_expenses` in `PERMISSION_MATRIX` (`lib/permissions.ts`),
seguendo lo stesso schema delle altre risorse finanziarie sensibili:

| Ruolo | Permessi |
|---|---|
| superadmin | `read`, `create`, `update`, `delete` (categoria + importi + toggle attivo) |
| admin | `read`, `create`, `update` (può aggiungere categorie, modificare importi, attivare/disattivare — **non può eliminare categorie**) |
| dipendente | nessuno (dato finanziario sensibile, come `reports`) |

## Vista

Nuova pagina `app/dashboard/reports/spese-fisse/page.tsx`, raggiungibile
dall'indice Reports (`app/dashboard/reports/page.tsx`) accanto alla card
"Overview Lavori" già esistente.

- Selettore anno (`fiscalYear`), stesso pattern/componente di
  `JobsForecastYearSelect` usato in Overview Lavori (default anno corrente).
- Tabella con una riga per categoria (non eliminata), colonne: Categoria,
  Importo (modificabile inline per l'anno selezionato), toggle
  attivo/disattivo, azione elimina categoria (visibile solo a superadmin).
- Riga totale in fondo: somma degli importi delle sole entry con
  `isActive = true` per l'anno selezionato.
- Pulsante "Aggiungi categoria" (visibile ad admin e superadmin): apre un
  piccolo form/modal con solo l'etichetta; la nuova categoria compare subito
  in tabella con importo 0 per l'anno corrente.
- L'eliminazione di una categoria (superadmin) è un soft delete con doppia
  conferma (pattern `DoubleConfirmModal` già in uso nel resto del gestionale),
  dato che nasconde anche lo storico di tutte le sue entry passate.

## Fuori scope (rimandato a D)

- Il totale "Bilancio Previsionale" (Costi Fissi + Costi Progetti + Costi
  Manutenzioni contro Fatturato Progetti + Manutenzioni + Conteggio Orario) è
  competenza del sotto-progetto D, che consumerà il totale calcolato qui.
