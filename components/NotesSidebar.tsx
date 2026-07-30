'use client';

import { NotebookPen } from 'lucide-react';
import { useNotesSidebarStore } from '@/lib/store/notesSidebarStore';
import ProjectTaskList from '@/components/ProjectTaskList';
import type { Project, ProjectTask } from '@/lib/types';

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

  const activeCount = initialTasks.filter((t) => t.status !== 'completed').length;
  const completedCount = initialTasks.filter((t) => t.status === 'completed').length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Apri Appunti"
        title="Appunti"
        className="flex w-[50px] shrink-0 flex-col items-center gap-3 border-r border-grid-border bg-card-bg pt-4"
      >
        <NotebookPen size={16} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
        <div className="flex flex-col items-center gap-2">
          <span className="flex flex-col items-center gap-0.5" title="Appunti attivi">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-primary">{activeCount}</span>
          </span>
          <span className="flex flex-col items-center gap-0.5" title="Appunti completati">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-secondary">{completedCount}</span>
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex w-[400px] shrink-0 flex-col border-r border-grid-border bg-card-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-grid-border px-4 py-3">
        <NotebookPen size={15} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
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
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <ProjectTaskList projectId={project.id} initialTasks={initialTasks} userOptions={userOptions} />
      </div>
    </div>
  );
}
