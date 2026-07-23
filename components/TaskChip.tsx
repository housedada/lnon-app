'use client';

import { useState } from 'react';
import { GripVertical, ChevronRight, Plus, Trash2 } from 'lucide-react';
import AssigneeFloatingMenu from '@/components/AssigneeFloatingMenu';
import RowContextMenu from '@/components/RowContextMenu';
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
  level,
  hasChildren,
  collapsed,
  userOptions,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDrop,
  onStatusClick,
  onAssigneeSelect,
  onRename,
  onAddSubtask,
  onDelete,
}: {
  task: ProjectTask;
  level: number;
  hasChildren: boolean;
  collapsed: boolean;
  userOptions: { id: string; name: string; color?: string }[];
  onToggleCollapse: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onStatusClick: () => void;
  onAssigneeSelect: (userId: string | null) => void;
  onRename: (title: string) => void;
  onAddSubtask: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function commitRename() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.title) {
      onRename(trimmed);
    } else {
      setDraft(task.title);
    }
  }

  return (
    <RowContextMenu
      menu={
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 transition hover:bg-row-hover"
        >
          <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
          Elimina
        </button>
      }
    >
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ marginLeft: level * 16 }}
      className={`group/task relative flex items-center gap-1.5 rounded border px-2 py-1.5 pr-20 text-xs transition-colors ${STATUS_STYLE[task.status]} ${level > 0 ? 'border-l-2 border-l-secondary/30' : ''}`}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Espandi sotto task' : 'Comprimi sotto task'}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-secondary"
        >
          <ChevronRight size={12} strokeWidth={2} className={`transition-transform ${collapsed ? '' : 'rotate-90'}`} aria-hidden="true" />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      <span
        draggable
        onDragStart={onDragStart}
        className="flex shrink-0 cursor-grab items-center active:cursor-grabbing"
        aria-label="Trascina per riordinare"
      >
        <GripVertical
          size={12}
          strokeWidth={1.75}
          className="text-secondary opacity-0 transition-opacity group-hover/task:opacity-60"
          aria-hidden="true"
        />
      </span>

      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitRename();
            }
            if (e.key === 'Escape') {
              setDraft(task.title);
              setEditing(false);
            }
          }}
          className="w-full truncate border-none bg-transparent p-0 text-xs text-primary outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 cursor-text truncate text-primary"
          title="Clicca per rinominare"
        >
          {task.title}
        </span>
      )}

      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        <button
          type="button"
          onClick={onAddSubtask}
          aria-label="Aggiungi sotto task"
          title="Aggiungi sotto task"
          className="flex h-4 w-4 shrink-0 items-center justify-center text-secondary opacity-0 transition-opacity group-hover/task:opacity-70 hover:!opacity-100"
        >
          <Plus size={12} strokeWidth={2} aria-hidden="true" />
        </button>
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
    </RowContextMenu>
  );
}
