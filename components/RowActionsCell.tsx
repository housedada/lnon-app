'use client';

import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * Cella azioni sticky a destra delle righe lista: su desktop mostra tutte le
 * icone inline come oggi, su mobile collassa in un solo bottone a tre puntini
 * che apre una tendina orizzontale con le stesse azioni (nessuna modifica al
 * markup delle azioni stesse, solo al contenitore).
 */
export default function RowActionsCell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="sticky right-0 z-[5] flex items-center justify-end whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-4 group-hover:bg-row-hover">
      <div className="hidden items-center gap-2.5 sm:flex">{children}</div>

      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMobileOpen((v) => !v);
          }}
          aria-label="Azioni"
          aria-expanded={mobileOpen}
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
        >
          <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div
              onClick={() => setMobileOpen(false)}
              className="absolute right-0 top-full z-20 mt-1 flex items-center gap-3 whitespace-nowrap rounded-md border border-grid-border bg-card-bg px-3 py-2 shadow-lg"
            >
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
