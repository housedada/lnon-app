'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Ricorda l'ultima sotto-pagina visitata all'interno di un gruppo (es. Lista/
 * Archivio/Cestino di Lavori o Fatture) e, quando si atterra sulla route
 * "di ingresso" del gruppo (entryHref), ci riporta lì automaticamente.
 * Va montato una volta per pagina, con il proprio tabKey.
 */
export default function RememberRoute({
  storageKey,
  tabKey,
  entryHref,
  tabs,
}: {
  storageKey: string;
  tabKey: string;
  entryHref: string;
  tabs: Record<string, string>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem(storageKey, tabKey);
  }, [storageKey, tabKey]);

  useEffect(() => {
    if (pathname !== entryHref) return;
    const saved = localStorage.getItem(storageKey);
    const savedHref = saved ? tabs[saved] : undefined;
    if (savedHref && savedHref !== pathname) router.replace(savedHref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
