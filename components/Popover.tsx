'use client';

import { useEffect, useRef, useState } from 'react';

export default function Popover({
  trigger,
  align = 'right',
  children,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`modal-panel card-shadow absolute top-full z-[150] mt-2 min-w-52 rounded-lg border border-grid-border bg-card-bg py-1.5 text-sm ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
