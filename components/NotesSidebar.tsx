'use client';

import { NotebookPen, StickyNote, X } from 'lucide-react';
import { useNotesSidebarStore } from '@/lib/store/notesSidebarStore';
import ProjectTaskList from '@/components/ProjectTaskList';
import type { Project, ProjectTask } from '@/lib/types';

const HEADER_HEIGHT = 'h-[49px]';

export default function NotesSidebar({
  project,
  initialTasks,
  userOptions,
}: {
  project: Project;
  initialTasks: ProjectTask[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const open = useNotesSidebarStore((s) => s.open);
  const toggle = useNotesSidebarStore((s) => s.toggle);

  const items = initialTasks.filter((t) => t.kind !== 'note');
  const activeCount = items.filter((t) => t.status !== 'completed').length;
  const completedCount = items.filter((t) => t.status === 'completed').length;
  const noteCount = initialTasks.filter((t) => t.kind === 'note').length;

  if (!open) {
    return (
      <div className="flex w-[50px] shrink-0 flex-col border-r border-grid-border bg-card-bg">
        <button
          type="button"
          onClick={toggle}
          aria-label="Apri Appunti"
          title="Appunti"
          className={`flex ${HEADER_HEIGHT} shrink-0 items-center justify-center border-b border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary`}
        >
          <NotebookPen size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center gap-2 pt-4">
          <span className="flex flex-col items-center gap-0.5" title="Appunti attivi">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-primary">{activeCount}</span>
          </span>
          <span className="flex flex-col items-center gap-0.5" title="Appunti completati">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-secondary">{completedCount}</span>
          </span>
          <span className="flex flex-col items-center gap-0.5" title="Note">
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
              style={{ background: 'var(--color-note-bg)', border: '1px solid var(--color-note-border)' }}
            >
              <StickyNote size={8} strokeWidth={2.25} style={{ color: 'var(--color-note-margin)' }} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold text-secondary">{noteCount}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-r border-grid-border bg-card-bg">
      <button
        type="button"
        onClick={toggle}
        aria-label="Chiudi Appunti"
        title="Chiudi"
        className={`flex ${HEADER_HEIGHT} shrink-0 items-center gap-2 border-b border-grid-border px-4 text-left transition hover:bg-row-hover`}
      >
        <X size={15} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
        <p className="text-sm font-semibold text-primary">Appunti</p>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-secondary">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            {activeCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {completedCount}
          </span>
          <span className="flex items-center gap-1" title="Note">
            <span
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
              style={{ background: 'var(--color-note-bg)', border: '1px solid var(--color-note-border)' }}
            >
              <StickyNote size={8} strokeWidth={2.25} style={{ color: 'var(--color-note-margin)' }} aria-hidden="true" />
            </span>
            {noteCount}
          </span>
        </div>
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto py-3 pl-3 pr-4">
        <ProjectTaskList projectId={project.id} initialTasks={initialTasks} userOptions={userOptions} allowNotes />
      </div>
    </div>
  );
}
