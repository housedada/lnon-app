'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import TaskChip from '@/components/TaskChip';
import {
  createProjectTaskAction,
  updateProjectTaskStatusAction,
  updateProjectTaskAssigneeAction,
  updateProjectTaskTitleAction,
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
  const [creatingFor, setCreatingFor] = useState<string | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const task of tasks) {
      const key = task.parentTaskId ?? '__root__';
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks]);

  function toggleCollapse(taskId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function siblingIds(parentId: string | undefined) {
    return (childrenByParent.get(parentId ?? '__root__') ?? []).map((t) => t.id);
  }

  function handleDrop(task: ProjectTask, targetId: string) {
    if (!dragId || dragId === targetId) return;
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged || dragged.parentTaskId !== task.parentTaskId) return;
    setTasks((prev) => {
      const siblings = siblingIds(task.parentTaskId);
      const filtered = siblings.filter((id) => id !== dragId);
      const targetIndex = filtered.indexOf(targetId);
      filtered.splice(targetIndex, 0, dragId);
      const order = new Map(filtered.map((id, idx) => [id, idx]));
      const next = prev.map((t) => (order.has(t.id) ? { ...t, position: order.get(t.id)! } : t));
      startTransition(() => {
        reorderProjectTasksAction(filtered);
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

  function handleRename(task: ProjectTask, newTitle: string) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: newTitle } : t)));
    startTransition(async () => {
      const res = await updateProjectTaskTitleAction(task.id, newTitle);
      if (!res.success) notify(res.message);
    });
  }

  async function handleCreateSubmit(parentId: string | null) {
    const trimmed = title.trim();
    setTitle('');
    setCreatingFor(undefined);
    if (!trimmed) return;
    const res = await createProjectTaskAction(projectId, trimmed, parentId);
    if (res.success && res.task) {
      setTasks((prev) => [...prev, res.task!]);
      if (parentId) setCollapsed((prev) => { const next = new Set(prev); next.delete(parentId); return next; });
    } else {
      notify(res.message);
    }
  }

  function renderCreateInput(parentId: string | null, level: number) {
    return (
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => handleCreateSubmit(parentId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateSubmit(parentId);
          }
          if (e.key === 'Escape') {
            setCreatingFor(undefined);
            setTitle('');
          }
        }}
        style={{ marginLeft: level * 16 }}
        placeholder="Titolo task..."
        className="field-input w-full rounded border border-grid-border bg-transparent px-2 py-1.5 text-xs text-primary"
      />
    );
  }

  function renderNode(task: ProjectTask, level: number): React.ReactNode {
    const children = childrenByParent.get(task.id) ?? [];
    const isCollapsed = collapsed.has(task.id);
    return (
      <div key={task.id} className="flex flex-col gap-1.5">
        <TaskChip
          task={task}
          level={level}
          hasChildren={children.length > 0}
          collapsed={isCollapsed}
          userOptions={userOptions}
          onToggleCollapse={() => toggleCollapse(task.id)}
          onDragStart={() => setDragId(task.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(task, task.id)}
          onStatusClick={() => handleStatusClick(task)}
          onAssigneeSelect={(userId) => handleAssigneeSelect(task, userId)}
          onRename={(newTitle) => handleRename(task, newTitle)}
          onAddSubtask={() => {
            setCreatingFor(task.id);
            setTitle('');
            setCollapsed((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
          }}
        />
        {!isCollapsed && creatingFor === task.id && renderCreateInput(task.id, level + 1)}
        {!isCollapsed && children.map((child) => renderNode(child, level + 1))}
      </div>
    );
  }

  const rootTasks = childrenByParent.get('__root__') ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      {rootTasks.map((task) => renderNode(task, 0))}

      {creatingFor === null ? (
        renderCreateInput(null, 0)
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreatingFor(null);
            setTitle('');
          }}
          className="flex items-center justify-center gap-1 rounded border border-dashed border-grid-border py-1.5 text-[11px] text-secondary transition hover:border-solid hover:text-primary"
        >
          <Plus size={12} strokeWidth={2} aria-hidden="true" />
          Aggiungi Task
        </button>
      )}
    </div>
  );
}
