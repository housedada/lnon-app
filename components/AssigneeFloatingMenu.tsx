'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRoundPlus, Check } from 'lucide-react';

export default function AssigneeFloatingMenu({
  userOptions,
  assignedIds,
  onToggle,
}: {
  userOptions: { id: string; name: string; color?: string }[];
  assignedIds: string[];
  onToggle: (userId: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 200;
    const menuHeight = Math.min(320, 16 + userOptions.length * 34);
    let left = rect.right - menuWidth;
    let top = rect.bottom + 4;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    if (top + menuHeight > window.innerHeight - 8) top = rect.top - menuHeight - 4;
    if (top < 8) top = 8;
    setPos({ top, left });
  }

  function close() {
    setPos(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={open}
        aria-label="Gestisci assegnatari"
        title="Gestisci assegnatari"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-secondary transition hover:text-primary"
        style={{ background: 'var(--color-grid-border)' }}
      >
        <UserRoundPlus size={11} strokeWidth={2} aria-hidden="true" />
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={close} />
            <div
              role="menu"
              className="modal-panel card-shadow fixed z-[200] max-h-80 w-52 overflow-y-auto rounded-lg border border-grid-border bg-card-bg py-1.5 text-sm"
              style={{ top: pos.top, left: pos.left }}
            >
              {userOptions.length === 0 && (
                <p className="px-3 py-1.5 text-xs text-secondary">Nessun membro disponibile.</p>
              )}
              {userOptions.map((u) => {
                const active = assignedIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onToggle(u.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-primary transition hover:bg-row-hover"
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: u.color ?? 'var(--color-grid-border)' }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                    {active && <Check size={13} strokeWidth={2.5} className="shrink-0 text-green-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
