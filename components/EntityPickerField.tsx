'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronDown, Check } from 'lucide-react';

interface EntityOption {
  id: string;
  label: string;
}

interface EntityPickerFieldProps {
  name: string;
  label: string;
  options: EntityOption[];
  defaultValue?: string;
  defaultValues?: string[];
  multiple?: boolean;
  placeholder?: string;
}

/**
 * Sostituto di una <select> nativa per campi con molte opzioni (clienti,
 * contratti): apre una modale con ricerca invece di un menu a tendina
 * lunghissimo. Non salva nulla da sé: scrive solo input nascosti nel form
 * genitore (stesso principio di AssignedToPicker/ProductTagPicker), il
 * salvataggio avviene al submit del form.
 */
export default function EntityPickerField({
  name,
  label,
  options,
  defaultValue,
  defaultValues,
  multiple = false,
  placeholder = 'Cerca...',
}: EntityPickerFieldProps) {
  const [selected, setSelected] = useState<string[]>(multiple ? (defaultValues ?? []) : defaultValue ? [defaultValue] : []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return filtered.slice(0, 50);
  }, [query, options]);

  function selectOne(id: string) {
    setSelected([id]);
    setOpen(false);
  }

  function toggleMultiple(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function removeChip(id: string) {
    setSelected((s) => s.filter((x) => x !== id));
  }

  function closeModal() {
    setOpen(false);
    setQuery('');
  }

  const selectedLabels = selected.map((id) => optionById.get(id)?.label ?? id);

  return (
    <div>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-secondary">
        {label}
      </p>

      {multiple ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-grid-border p-2">
          {selectedLabels.map((l, i) => (
            <span
              key={selected[i]}
              className="flex items-center gap-1 rounded-full bg-grid-header-bg px-2.5 py-1 text-xs font-medium text-primary"
            >
              {l}
              <button type="button" onClick={() => removeChip(selected[i])} aria-label={`Rimuovi ${l}`} className="text-secondary hover:text-primary">
                <X size={12} strokeWidth={2} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-dashed border-grid-border px-2.5 py-1 text-xs font-medium text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            + Aggiungi
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-grid-border bg-transparent px-3 py-2.5 text-left text-sm text-primary transition hover:bg-row-hover"
        >
          <span className={selectedLabels[0] ? 'text-primary' : 'text-secondary'}>{selectedLabels[0] ?? placeholder}</span>
          <ChevronDown size={15} strokeWidth={1.75} className="shrink-0 text-secondary" aria-hidden="true" />
        </button>
      )}

      {open &&
        createPortal(
          <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
            <div
              role="dialog"
              aria-modal="true"
              className="modal-panel card-shadow w-full max-w-md rounded-xl border border-grid-border bg-card-bg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-primary">{label}</h2>
                <button type="button" onClick={closeModal} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="relative mt-4">
                <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                  className="w-full rounded-lg border border-grid-border bg-transparent py-2 pl-9 pr-3 text-sm text-primary"
                />
              </div>

              <ul className="mt-3 max-h-72 divide-y divide-grid-border overflow-y-auto rounded-lg border border-grid-border">
                {results.length === 0 && <li className="px-3 py-3 text-xs text-secondary">Nessun risultato.</li>}
                {results.map((opt) => {
                  const isSelected = selected.includes(opt.id);
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => (multiple ? toggleMultiple(opt.id) : selectOne(opt.id))}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-primary transition hover:bg-row-hover"
                      >
                        {opt.label}
                        {isSelected && <Check size={15} strokeWidth={2} className="shrink-0 text-[var(--accent-to)]" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {multiple && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-accent mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Fatto
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
