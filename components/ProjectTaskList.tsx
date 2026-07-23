'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import TaskChip from '@/components/TaskChip';
import {
  createProjectTaskAction,
  updateProjectTaskStatusAction,
  updateProjectTaskAssigneeAction,
  reorderProjectTasksAction,
} from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import type { ProjectTask, ProjectTaskStatus } from '@/lib/types';

const NEXT_STATUS: Record<ProjectTaskStatus, ProjectTaskStatus> = {
  todo: 'in_progress',
  in_progress: 'completed',
  completed: 'todo',
};

export default function ProjectTaskList({
  projectId,
  initialTasks,
  userOptions,
}: {
  projectId: string;
  initialTasks: ProjectTask[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== dragId);
      const dragged = prev.find((t) => t.id === dragId);
      if (!dragged) return prev;
      const targetIndex = next.findIndex((t) => t.id === targetId);
      next.splice(targetIndex, 0, dragged);
      startTransition(() => {
        reorderProjectTasksAction(next.map((t) => t.id));
      });
      return next;
    });
    setDragId(null);
  }

  function handleStatusClick(task: ProjectTask) {
    const nextStatus = NEXT_STATUS[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    startTransition(async () => {
      const res = await updateProjectTaskStatusAction(task.id, nextStatus);
      if (!res.success) notify(res.message);
    });
  }

  function handleAssigneeSelect(task: ProjectTask, userId: string | null) {
    const user = userOptions.find((u) => u.id === userId);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assignedTo: userId ?? undefined, assignedToName: user?.name, assignedToColor: user?.color } : t)));
    startTransition(async () => {
      const res = await updateProjectTaskAssigneeAction(task.id, userId);
      if (!res.success) notify(res.message);
    });
  }

  async function handleCreateSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setCreating(false);
      setTitle('');
      return;
    }
    setTitle('');
    setCreating(false);
    const res = await createProjectTaskAction(projectId, trimmed);
    if (res.success && res.task) {
      setTasks((prev) => [...prev, res.task!]);
    } else {
      notify(res.message);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tasks.map((task) => (
        <TaskChip
          key={task.id}
          task={task}
          userOptions={userOptions}
          onDragStart={() => setDragId(task.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(task.id)}
          onStatusClick={() => handleStatusClick(task)}
          onAssigneeSelect={(userId) => handleAssigneeSelect(task, userId)}
        />
      ))}

      {creating ? (
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleCreateSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateSubmit();
            }
            if (e.key === 'Escape') {
              setCreating(false);
              setTitle('');
            }
          }}
          placeholder="Titolo task..."
          className="field-input w-full rounded border border-grid-border bg-transparent px-2 py-1.5 text-xs text-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="task-create-cta flex items-center justify-center gap-1 rounded border border-dashed border-grid-border py-1.5 text-[11px] text-secondary transition hover:border-solid hover:text-primary"
        >
          <Plus size={12} strokeWidth={2} aria-hidden="true" />
          Crea Task
        </button>
      )}
    </div>
  );
}
