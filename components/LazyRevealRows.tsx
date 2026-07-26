'use client';

import { Children, cloneElement, isValidElement, useEffect, useState, type ReactNode } from 'react';

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 140;

/**
 * Rivela le righe di una lista lunga (pageSize > 25) a lotti di 25 con un
 * leggero fade-in, invece di piazzarle tutte a schermo in un colpo solo. Il
 * primo lotto compare subito senza animazione (non c'è nulla da "caricare"
 * in più rispetto a prima); solo i lotti successivi prendono il fade-in.
 * Le righe arrivano già renderizzate da un Server Component (children), qui
 * si limita quante mostrarne e si clona ciascuna per aggiungere la classe.
 */
export default function LazyRevealRows({ children, total, enabled }: { children: ReactNode; total: number; enabled: boolean }) {
  const [visibleCount, setVisibleCount] = useState(enabled ? Math.min(BATCH_SIZE, total) : total);

  useEffect(() => {
    if (!enabled || total <= BATCH_SIZE) {
      setVisibleCount(total);
      return;
    }
    setVisibleCount(Math.min(BATCH_SIZE, total));
    let current = BATCH_SIZE;
    const id = setInterval(() => {
      current += BATCH_SIZE;
      setVisibleCount(Math.min(current, total));
      if (current >= total) clearInterval(id);
    }, BATCH_DELAY_MS);
    return () => clearInterval(id);
  }, [total, enabled]);

  const visible = Children.toArray(children).slice(0, visibleCount);

  return (
    <>
      {visible.map((child, i) =>
        isValidElement<{ className?: string }>(child) && i >= BATCH_SIZE
          ? cloneElement(child, { className: `${child.props.className ?? ''} list-row-fade-in`.trim() })
          : child
      )}
    </>
  );
}
