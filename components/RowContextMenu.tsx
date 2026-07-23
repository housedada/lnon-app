'use client';

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Wrapper generico: rende i figli (es. una riga "group contents" di una
 * grid-lista) e in più intercetta il tasto destro del mouse per aprire un
 * menu contestuale posizionato esattamente dove si è cliccato.
 */
export default function RowContextMenu({
  menu,
  className,
  children,
}: {
  menu: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  }

  function close() {
    setPos(null);
  }

  return (
    <div className={className} onContextMenu={handleContextMenu}>
      {children}
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
            <div
              role="menu"
              className="modal-panel card-shadow fixed z-[200] min-w-52 rounded-lg border border-grid-border bg-card-bg py-1.5 text-sm"
              style={{ top: pos.y, left: pos.x }}
              onClick={close}
            >
              {menu}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
