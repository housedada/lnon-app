'use client';

export default function HourlyWorkEntryForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4 p-8"
    >
      <div className="field-wrap">
        <input
          type="text"
          name="platformReference"
          id="platformReference"
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="platformReference" className="field-floating-label">
          Riferimento piattaforma
        </label>
      </div>
      <div className="field-wrap">
        <input
          type="text"
          name="description"
          id="description"
          required
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="description" className="field-floating-label">
          Descrizione lavorazione *
        </label>
      </div>
      <div className="field-wrap">
        <input
          type="number"
          name="hours"
          id="hours"
          step="0.5"
          min="0.5"
          required
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="hours" className="field-floating-label">
          Ore *
        </label>
      </div>
      <button type="submit" disabled={isPending} className="btn-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
        Aggiungi lavorazione
      </button>
    </form>
  );
}
