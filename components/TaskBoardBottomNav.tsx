'use client';

import { useTaskBoardScrollStore, scrollToColumn } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';

export default function TaskBoardBottomNav() {
  const columns = useTaskBoardScrollStore((s) => s.columns);
  const density = useTaskBoardViewStore((s) => s.density);

  if (density === 'masonry' || columns.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-grid-border bg-card-bg px-4 py-2">
      {columns.map((col) => (
        <button
          key={col.id}
          type="button"
          onClick={() => scrollToColumn(col.id)}
          title={col.label}
          className="shrink-0 whitespace-nowrap rounded-full border border-grid-border px-3 py-1 text-xs text-secondary transition hover:border-primary hover:text-primary"
        >
          {col.label}
        </button>
      ))}
    </div>
  );
}
