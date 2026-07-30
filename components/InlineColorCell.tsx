'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { notify } from '@/lib/notify';
import { USER_TAG_COLORS } from '@/lib/types';

/**
 * Pallino colore cliccabile che apre un popover con la palette (stesso
 * pattern autosave/ottimistico di InlineSelectCell, ma per uno swatch invece
 * che per un badge testuale).
 */
export default function InlineColorCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (newColor: string) => Promise<{ success: boolean; message: string }>;
}) {
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
    setPos({ top: rect.bottom + 6, left: rect.left });
  }

  function closePopover() {
    setPos(null);
  }

  async function handleSelect(e: React.MouseEvent, newColor: string) {
    e.stopPropagation();
    closePopover();
    if (newColor === optimisticValue) return;

    const previousValue = optimisticValue;
    setOptimisticValue(newColor);
    setIsPending(true);

    try {
      const res = await onSave(newColor);
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        disabled={isPending}
        aria-label="Cambia colore"
        title="Cambia colore"
        className="flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-inset ring-transparent transition hover:scale-110 hover:ring-black/20 hover:shadow-sm disabled:opacity-60"
        style={{ background: optimisticValue || '#999' }}
      />
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={closePopover} />
            <div
              role="menu"
              className="inline-select-popover fixed z-[200] grid grid-cols-8 gap-1.5 p-2"
              style={{ top: pos.top, left: pos.left }}
            >
              {USER_TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => handleSelect(e, c)}
                  aria-label={`Seleziona colore ${c}`}
                  aria-pressed={optimisticValue === c}
                  className="flex h-6 w-6 items-center justify-center rounded-full transition hover:scale-110"
                  style={{ background: c }}
                >
                  {optimisticValue === c && <Check size={12} strokeWidth={2.5} className="text-neutral-700" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
