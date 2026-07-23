'use client';

import { MoreVertical } from 'lucide-react';
import Popover from '@/components/Popover';

export default function RowContextMenu({ children }: { children: React.ReactNode }) {
  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Altre azioni"
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
        >
          <MoreVertical size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    >
      {children}
    </Popover>
  );
}
