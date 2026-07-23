'use client';

import { useTaskBoardScrollStore, scrollToColumn } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';

export default function TaskBoardBottomNav() {
  const columns = useTaskBoardScrollStore((s) => s.columns);
  const density = useTaskBoardViewStore((s) => s.density);

  if (density === 'masonry' || columns.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 h-[66px] shrink-0 overflow-x-auto overflow-y-hidden">
      <div className="relative flex h-full min-w-max items-center gap-3 px-4">
        <div
          className="pointer-events-none absolute inset-x-4 top-1/2 h-0 -translate-y-1/2 border-t border-dashed"
          style={{ borderColor: 'color-mix(in srgb, var(--color-secondary) 35%, transparent)' }}
          aria-hidden="true"
        />
        {columns.map((col) => {
          const hasBackground = Boolean(col.background);
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => scrollToColumn(col.id)}
              title={col.label}
              style={hasBackground ? { background: col.background } : undefined}
              className={`relative z-10 shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-medium transition ${
                hasBackground
                  ? 'border-transparent text-neutral-800 hover:brightness-95'
                  : 'border-grid-border text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {col.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
