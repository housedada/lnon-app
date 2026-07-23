'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRound } from 'lucide-react';

export default function AssigneeFloatingMenu({
  userOptions,
  currentAssignee,
  onSelect,
}: {
  userOptions: { id: string; name: string; color?: string }[];
  currentAssignee?: string;
  onSelect: (userId: string | null) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 200;
    const menuHeight = Math.min(320, 56 + userOptions.length * 34);
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

  const current = userOptions.find((u) => u.id === currentAssignee);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={open}
        aria-label="Assegna task"
        title={current ? `Assegnato a ${current.name}` : 'Assegna task'}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition"
        style={{ background: current?.color ?? 'var(--color-grid-border)' }}
      >
        {!current && <UserRound size={11} strokeWidth={2} className="text-secondary" aria-hidden="true" />}
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
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  close();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-secondary transition hover:bg-row-hover hover:text-primary"
              >
                — Non assegnato —
              </button>
              {userOptions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSelect(u.id);
                    close();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-primary transition hover:bg-row-hover"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: u.color ?? 'var(--color-grid-border)' }} aria-hidden="true" />
                  {u.name}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
