'use client';

import { useEffect } from 'react';

/**
 * Ricorda l'ultima sotto-pagina visitata all'interno di un gruppo (es. Lista/
 * Archivio/Cestino di Lavori o Fatture): va montato una volta per pagina, con
 * il proprio tabKey. Il ritorno automatico alla sotto-vista salvata vive
 * nella Sidebar (che non si smonta mai passando da una sezione all'altra) —
 * un redirect qui, basato sul pathname della route "di ingresso" del gruppo,
 * scattava anche quando l'utente aveva appena cliccato proprio quella
 * sotto-voce, perché le due situazioni sono indistinguibili dal solo pathname.
 */
export default function RememberRoute({ storageKey, tabKey }: { storageKey: string; tabKey: string }) {
  useEffect(() => {
    localStorage.setItem(storageKey, tabKey);
  }, [storageKey, tabKey]);

  return null;
}
