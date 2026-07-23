'use client';

import { Columns4, Columns2, LayoutGrid } from 'lucide-react';
import { useTaskBoardViewStore, type TaskBoardDensity } from '@/lib/store/taskBoardViewStore';

const OPTIONS: { value: TaskBoardDensity; label: string; icon: typeof Columns4 }[] = [
  { value: 'narrow', label: 'Colonne strette', icon: Columns4 },
  { value: 'wide', label: 'Colonne larghe', icon: Columns2 },
  { value: 'masonry', label: 'Masonry', icon: LayoutGrid },
];

export default function TaskBoardViewToggle() {
  const density = useTaskBoardViewStore((s) => s.density);
  const setDensity = useTaskBoardViewStore((s) => s.setDensity);

  return (
    <div className="ml-auto flex items-center gap-0.5 rounded-md border border-grid-border p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = density === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDensity(opt.value)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={`flex h-7 w-7 items-center justify-center rounded transition ${
              active ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
