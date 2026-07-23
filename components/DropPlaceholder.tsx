'use client';

import { useEffect, useState } from 'react';

/**
 * Indicatore del punto in cui verrà rilasciato l'elemento trascinato: un box con
 * bordo tratteggiato che cresce con una breve animazione all'apparizione (entrata
 * fluida). La scomparsa è istantanea, in linea con l'istantaneità del drop stesso.
 */
export default function DropPlaceholder({ orientation, size }: { orientation: 'vertical' | 'horizontal'; size: string }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const baseClass = 'shrink-0 overflow-hidden rounded-lg border-2 border-dashed transition-all duration-200 ease-out';
  const style: React.CSSProperties = {
    borderColor: 'var(--accent-to)',
    background: 'color-mix(in srgb, var(--accent-to) 8%, transparent)',
    opacity: grown ? 1 : 0,
  };

  if (orientation === 'horizontal') {
    style.width = grown ? size : '0px';
    return <div className={`${baseClass} self-stretch`} style={style} aria-hidden="true" />;
  }

  style.height = grown ? size : '0px';
  return <div className={`${baseClass} w-full`} style={style} aria-hidden="true" />;
}
