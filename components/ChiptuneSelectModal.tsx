'use client';

import { createPortal } from 'react-dom';
import { Play, X, Check, Shuffle } from 'lucide-react';
import SpaceInvaderIcon from '@/components/SpaceInvaderIcon';
import { TUNES, RANDOM_CHOICE, CHIPTUNE_CHOICE_STORAGE_KEY, playChiptuneById, playRandomChiptune } from '@/lib/chiptunes';

export default function ChiptuneSelectModal({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (choice: string) => void;
  onClose: () => void;
}) {
  function choose(choice: string) {
    localStorage.setItem(CHIPTUNE_CHOICE_STORAGE_KEY, choice);
    onSelect(choice);
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel w-full max-w-sm rounded-lg border-2 border-lime-400/60 bg-[#0a0e0a] p-5 font-mono shadow-[0_0_24px_rgba(163,230,53,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-lime-400/30 pb-3">
          <div className="flex items-center gap-2.5 text-lime-400">
            <SpaceInvaderIcon size={22} />
            <h2 className="text-xs font-semibold uppercase tracking-widest">Motivetto Intro</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-lime-400/70 transition hover:text-lime-300">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 flex flex-col">
          <button
            type="button"
            onClick={() => choose(RANDOM_CHOICE)}
            className="flex items-center justify-between gap-3 rounded px-2 py-2.5 text-left text-[11px] uppercase tracking-wide text-lime-100 transition hover:bg-lime-400/10"
          >
            <span className="flex items-center gap-2">
              <Shuffle size={13} strokeWidth={2} className="text-lime-400" aria-hidden="true" />
              Casuale
              {selected === RANDOM_CHOICE && <Check size={13} strokeWidth={2} className="text-lime-400" aria-hidden="true" />}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                playRandomChiptune();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  playRandomChiptune();
                }
              }}
              aria-label="Ascolta un motivetto a caso"
              title="Preview"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lime-400/80 transition hover:bg-lime-400/20 hover:text-lime-300"
            >
              <Play size={12} strokeWidth={2} fill="currentColor" />
            </span>
          </button>

          <div className="my-1 border-t border-dashed border-lime-400/25" />

          {TUNES.map((tune) => (
            <button
              key={tune.id}
              type="button"
              onClick={() => choose(tune.id)}
              className="flex items-center justify-between gap-3 rounded px-2 py-2.5 text-left text-[11px] uppercase tracking-wide text-lime-100 transition hover:bg-lime-400/10"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{tune.name}</span>
                {selected === tune.id && <Check size={13} strokeWidth={2} className="shrink-0 text-lime-400" aria-hidden="true" />}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  playChiptuneById(tune.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    playChiptuneById(tune.id);
                  }
                }}
                aria-label={`Ascolta ${tune.name}`}
                title="Preview"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lime-400/80 transition hover:bg-lime-400/20 hover:text-lime-300"
              >
                <Play size={12} strokeWidth={2} fill="currentColor" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
