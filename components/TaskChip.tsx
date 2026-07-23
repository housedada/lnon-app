'use client';

import { GripVertical } from 'lucide-react';
import AssigneeFloatingMenu from '@/components/AssigneeFloatingMenu';
import type { ProjectTask, ProjectTaskStatus } from '@/lib/types';

const STATUS_STYLE: Record<ProjectTaskStatus, string> = {
  todo: 'bg-transparent border-grid-border',
  in_progress: 'bg-yellow-300/25 border-yellow-500/50',
  completed: 'bg-green-500/15 border-green-600/50',
};

const STATUS_DOT: Record<ProjectTaskStatus, string> = {
  todo: 'bg-secondary/40',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-600',
};

export default function TaskChip({
  task,
  userOptions,
  onDragStart,
  onDragOver,
  onDrop,
  onStatusClick,
  onAssigneeSelect,
}: {
  task: ProjectTask;
  userOptions: { id: string; name: string; color?: string }[];
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onStatusClick: () => void;
  onAssigneeSelect: (userId: string | null) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group/task relative flex items-center gap-1.5 rounded border px-2 py-1.5 pr-14 text-xs transition-colors ${STATUS_STYLE[task.status]}`}
    >
      <span
        draggable
        onDragStart={onDragStart}
        className="flex cursor-grab items-center gap-1.5 truncate active:cursor-grabbing"
      >
        <GripVertical
          size={12}
          strokeWidth={1.75}
          className="shrink-0 text-secondary opacity-0 transition-opacity group-hover/task:opacity-60"
          aria-hidden="true"
        />
        <span className="truncate text-primary">{task.title}</span>
      </span>

      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        <button
          type="button"
          onClick={onStatusClick}
          aria-label={`Cambia stato (attuale: ${task.status})`}
          title={`Cambia stato (attuale: ${task.status})`}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[task.status]}`} aria-hidden="true" />
        </button>
        <AssigneeFloatingMenu userOptions={userOptions} currentAssignee={task.assignedTo} onSelect={onAssigneeSelect} />
      </div>
    </div>
  );
}
