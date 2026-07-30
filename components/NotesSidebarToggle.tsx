'use client';

import { NotebookPen } from 'lucide-react';
import { useNotesSidebarStore } from '@/lib/store/notesSidebarStore';

export default function NotesSidebarToggle() {
  const open = useNotesSidebarStore((s) => s.open);
  const toggle = useNotesSidebarStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? 'Chiudi Appunti' : 'Apri Appunti'}
      aria-pressed={open}
      title="Appunti"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
        open ? 'border-secondary bg-card-bg text-primary' : 'border-transparent text-secondary hover:border-grid-border hover:text-primary'
      }`}
    >
      <NotebookPen size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
