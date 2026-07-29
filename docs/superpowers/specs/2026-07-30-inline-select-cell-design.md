# Inline Select Cell — cambio valore da lista con autosave

## Contesto

Oggi, per cambiare lo stato di un lavoro, bisogna aprire il form di modifica del Job (`/dashboard/jobs/[id]/edit`), cambiare la select "Stato" e salvare — troppi passaggi per un'operazione frequente. L'unica scorciatoia esistente è il pulsante "Approva" (`ApproveJobButton`), che copre solo la transizione `preventivato → pre_approvato`.

Serve un componente generico che permetta di cambiare un valore "schematizzato" (un campo enum con un set fisso di opzioni, come lo status) direttamente dalla riga di una lista, con salvataggio immediato (autosave via server action), riusabile su altre liste/campi in futuro. Primo utilizzo: lo stato del Job in `/dashboard/jobs` (`JobRow.tsx`).

## Architettura

Due livelli, separazione netta tra meccanica generica e conoscenza di dominio:

### 1. `components/InlineSelectCell.tsx` (generico, riusabile)

Componente client puro, non sa nulla di Job/status: riceve valore corrente, lista di opzioni, un renderer per il badge e una server action già "bindata" alla riga.

```ts
interface InlineSelectOption<T extends string> {
  value: T;
  label: string;
  badgeClassName: string; // classi tailwind per il badge, es. STATUS_BADGE[value]
}

interface InlineSelectCellProps<T extends string> {
  value: T;
  options: InlineSelectOption<T>[];
  onSave: (newValue: T) => Promise<{ success: boolean; message: string }>;
}
```

- Stato locale: `optimisticValue` (parte uguale a `value`, si aggiorna subito al click), `isPending`, `isOpen`.
- Badge cliccabile (usa `optimisticValue` per il render, tramite le `options` passate — nessun `renderBadge` esterno: il componente genera il badge da `label`/`badgeClassName` dell'opzione corrente, stesso identico markup di uno badge statico oggi).
- Click sul badge → apre popover in portal (stesso pattern di `RowContextMenu.tsx`: overlay full-screen invisibile per intercettare il click-outside + panel posizionato, z-index coerente con gli altri overlay `z-[190]`/`z-[200]`), ancorato sotto il badge (via `getBoundingClientRect` dell'elemento cliccato, non alla posizione del mouse come fa `RowContextMenu`).
- Popover: lista opzioni come righe cliccabili (stile coerente con le voci di `RowContextMenu`), quella corrente evidenziata.
- Click su un'opzione:
  1. Chiude il popover.
  2. Se il valore scelto è uguale a quello corrente, non fa nulla.
  3. Altrimenti: aggiorna `optimisticValue` subito, imposta `isPending=true`, chiama `onSave(newValue)`.
  4. Alla risoluzione: se `success`, `isPending=false` (il badge resta sul nuovo valore); se fallita, `optimisticValue` torna al valore precedente, `isPending=false`, e `notify(res.message)` (bus toast già esistente in `lib/notify.ts`).
- Durante `isPending`, il badge mostra un piccolo indicatore (es. bordo pulsante o icona spinner sovrapposta, stile minimale — non un pulsante disabilitato: la cella deve restare leggibile in lista).
- Click fuori dal popover o `Esc`: chiude senza alcuna chiamata.
- Nessuna gestione di permessi interna: se l'utente non può modificare, il chiamante non renderizza `InlineSelectCell` ma il badge statico di sempre (stesso pattern già in uso per `canUpdate`/`canApprove` in `JobRow.tsx`).

### 2. Wiring lato Job (dominio)

- `lib/actions/jobs.ts`: nuova `updateJobStatusAction(jobId: string, status: JobStatus): Promise<{ success: boolean; message: string }>` — stesso pattern di `deleteJobFromListAction`: verifica permesso (`hasPermission(role, 'jobs', 'update')`), chiama `updateDbJob(jobId, { status })`, `revalidatePath('/dashboard/jobs')`, ritorna `{success, message}` invece di fare `redirect` (a differenza di `updateJobAction`, pensata per il form completo).
- `components/JobRow.tsx`: il badge di stato attuale (righe con `STATUS_BADGE[job.status]`) diventa, quando `canUpdate` è true:
  ```tsx
  <InlineSelectCell
    value={job.status}
    options={JOB_STATUS_OPTIONS} // deriva da STATUS_LABEL/STATUS_BADGE già presenti nel file
    onSave={updateJobStatusAction.bind(null, job.id)}
  />
  ```
  quando `canUpdate` è false, resta il badge statico di oggi (nessuna modifica al comportamento per chi non può modificare).
- Il pulsante "Approva" (`ApproveJobButton`) resta invariato, indipendente: è una scorciatoia in più per la transizione più comune, non sostituita dal picker (come deciso: il picker permette liberamente tutti e 6 gli stati, nessuna mappa di transizioni valide da mantenere).

## Fuori scope

- Nessuna mappa di transizioni valide per stato (il picker è libero su tutti i 6 valori, come la select del form).
- Nessuna generalizzazione ad altri campi/liste in questo giro (contratti, clienti, ecc.) — il componente nasce generico ma il wiring reale è solo per lo stato Job.
- Nessuna modifica al form di modifica completo, che resta il percorso "ufficiale" per cambiare più campi insieme.

## Verifica

- `npx tsc --noEmit` + `npm run build`.
- Manuale: da `/dashboard/jobs`, cliccare il badge di stato di un job → si apre il popover, selezionare un nuovo stato → badge si aggiorna subito, poi conferma; ricaricare la pagina per verificare che il salvataggio sia realmente persistito. Provare anche un click-fuori (nessun cambiamento) e un utente senza permesso di update (badge resta statico, non cliccabile).
