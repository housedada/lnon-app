'use client';

import { useState } from 'react';
import { List, Columns4, Columns2, LayoutGrid } from 'lucide-react';
import { useTaskBoardViewStore, type TaskBoardDensity } from '@/lib/store/taskBoardViewStore';

const OPTIONS: { value: TaskBoardDensity; label: string; icon: typeof Columns4 }[] = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'narrow', label: 'Colonne strette', icon: Columns4 },
  { value: 'wide', label: 'Colonne larghe', icon: Columns2 },
  { value: 'masonry', label: 'Masonry', icon: LayoutGrid },
];

export default function TaskBoardViewToggle() {
  const density = useTaskBoardViewStore((s) => s.density);
  const setDensity = useTaskBoardViewStore((s) => s.setDensity);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeOption = OPTIONS.find((o) => o.value === density) ?? OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  return (
    <>
      {/* Desktop/tablet: tutte le opzioni sempre visibili */}
      <div className="ml-auto hidden items-center gap-0.5 rounded-md border border-grid-border p-0.5 sm:flex">
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

      {/* Mobile: un solo bottone che apre una tendina orizzontale con le opzioni */}
      <div className="relative ml-auto sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Cambia layout board"
          aria-expanded={mobileOpen}
          title={activeOption.label}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-grid-border text-primary transition hover:bg-row-hover"
        >
          <ActiveIcon size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-full z-20 mt-1 flex items-center gap-0.5 rounded-md border border-grid-border bg-card-bg p-0.5 shadow-lg">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = density === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDensity(opt.value);
                      setMobileOpen(false);
                    }}
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
          </>
        )}
      </div>
    </>
  );
}
