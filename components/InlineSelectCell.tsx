'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';

export interface InlineSelectOption<T extends string> {
  value: T;
  label: string;
  badgeClassName: string;
}

interface InlineSelectCellProps<T extends string> {
  value: T;
  options: InlineSelectOption<T>[];
  onSave: (newValue: T) => Promise<{ success: boolean; message: string }>;
}

/**
 * Badge cliccabile che apre un popover con una lista di opzioni: alla
 * selezione salva subito (autosave) tramite la server action passata,
 * aggiornando il badge in modo ottimistico. Generico: non sa nulla del
 * dominio (Job/status/ecc.), riceve valore, opzioni e callback di salvataggio
 * già "bindata" alla riga dal chiamante (stesso pattern di
 * deleteJobFromListAction.bind(null, jobId) usato altrove nell'app).
 */
export default function InlineSelectCell<T extends string>({ value, options, onSave }: InlineSelectCellProps<T>) {
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOptimisticValue(value);
  }, [value]);

  useEffect(() => {
    if (!pos) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPos(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos]);

  function openPopover(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: rect.left });
  }

  function closePopover() {
    setPos(null);
  }

  async function handleSelect(e: React.MouseEvent, newValue: T) {
    e.stopPropagation();
    closePopover();
    if (newValue === optimisticValue) return;

    const previousValue = optimisticValue;
    setOptimisticValue(newValue);
    setIsPending(true);

    try {
      const res = await onSave(newValue);
      if (!res.success) {
        setOptimisticValue(previousValue);
        notify(res.message);
      }
    } catch {
      setOptimisticValue(previousValue);
      notify('Salvataggio non riuscito.');
    } finally {
      setIsPending(false);
    }
  }

  const currentOption = options.find((o) => o.value === optimisticValue);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        className={`relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition hover:brightness-95 ${currentOption?.badgeClassName ?? ''}`}
      >
        {currentOption?.label ?? optimisticValue}
        {isPending && <Loader2 size={10} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={closePopover} />
            <div
              role="menu"
              className="inline-select-popover fixed z-[200] min-w-40 text-sm"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="inline-select-options">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelect(e, opt.value)}
                    className={`inline-select-option flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-row-hover ${
                      opt.value === optimisticValue ? 'text-primary' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${opt.badgeClassName}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
