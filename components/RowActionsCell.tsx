'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * Cella azioni sticky a destra delle righe lista: su desktop mostra tutte le
 * icone inline come oggi, su mobile collassa in un solo bottone a tre puntini
 * che apre una tendina orizzontale con le stesse azioni (nessuna modifica al
 * markup delle azioni stesse, solo al contenitore).
 *
 * La tendina mobile è montata via portal su document.body, posizionata con
 * le coordinate reali del bottone (getBoundingClientRect): dentro la cella
 * sticky della riga un posizionamento assoluto veniva coperto dalle righe
 * successive (stesso z-index locale, ma dopo nel DOM) e disallineato appena
 * la riga scorreva orizzontalmente. Fuori dal flusso della griglia, allineata
 * e sopra a tutto come gli altri modali dell'app (stesso z-[200]).
 */
export default function RowActionsCell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggleMobileMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (mobileOpen) {
      setMobileOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMobileOpen(true);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function close() {
      setMobileOpen(false);
    }
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [mobileOpen]);

  return (
    <div className="sticky right-0 z-[5] flex items-center justify-end whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-4 group-hover:bg-row-hover">
      <div className="hidden items-center gap-2.5 sm:flex">{children}</div>

      <div className="sm:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Azioni"
          aria-expanded={mobileOpen}
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
        >
          <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {mobileOpen &&
          coords &&
          createPortal(
            <>
              <div className="fixed inset-0 z-[190]" onClick={() => setMobileOpen(false)} aria-hidden="true" />
              <div
                onClick={() => setMobileOpen(false)}
                style={{ top: coords.top, right: coords.right }}
                className="fixed z-[200] flex items-center gap-3 whitespace-nowrap rounded-md border border-grid-border bg-card-bg px-3 py-2 shadow-lg"
              >
                {children}
              </div>
            </>,
            document.body
          )}
      </div>
    </div>
  );
}
