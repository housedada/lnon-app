'use client';

import { useEffect, useState } from 'react';

export default function AnimatedVisibility({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [rendered, setRendered] = useState(visible);
  const [closing, setClosing] = useState(false);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setRendered(true);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const timeout = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 180);
    return () => clearTimeout(timeout);
  }, [closing]);

  if (!rendered) return null;

  return <div className={closing ? 'widget-fade-out' : 'widget-fade-in'}>{children}</div>;
}
