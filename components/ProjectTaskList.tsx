'use client';

import { forwardRef, useImperativeHandle, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import TaskChip from '@/components/TaskChip';
import DropPlaceholder from '@/components/DropPlaceholder';
import ProjectTaskTrashModal from '@/components/ProjectTaskTrashModal';
import {
  createProjectTaskAction,
  updateProjectTaskStatusAction,
  toggleProjectTaskAssigneeAction,
  updateProjectTaskTitleAction,
  reorderProjectTasksAction,
  deleteProjectTaskAction,
} from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import type { ProjectTask, ProjectTaskStatus } from '@/lib/types';

const NEXT_STATUS: Record<ProjectTaskStatus, ProjectTaskStatus> = {
  todo: 'in_progress',
  in_progress: 'completed',
  completed: 'todo',
};

export interface ProjectTaskListHandle {
  openTrash: () => void;
  setAllCollapsed: (collapse: boolean) => void;
}

const ProjectTaskList = forwardRef<ProjectTaskListHandle, {
  projectId: string;
  initialTasks: ProjectTask[];
  userOptions: { id: string; name: string; color?: string }[];
}>(function ProjectTaskList({ projectId, initialTasks, userOptions }, ref) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [creatingFor, setCreatingFor] = useState<string | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'before' | 'after' | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);
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

  useImperativeHandle(ref, () => ({
    openTrash: () => setShowTrash(true),
    setAllCollapsed: (collapse: boolean) => {
      if (!collapse) {
        setCollapsed(new Set());
        return;
      }
      const parentIds = tasks.filter((t) => (childrenByParent.get(t.id)?.length ?? 0) > 0).map((t) => t.id);
      setCollapsed(new Set(parentIds));
    },
  }));

  function clearDragState() {
    setDragId(null);
    setDragOverId(null);
    setDragOverSide(null);
  }

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
    if (!dragId || dragId === targetId) {
      clearDragState();
      return;
    }
    const dragged = tasks.find((t) => t.id === dragId);
    if (!dragged || dragged.parentTaskId !== task.parentTaskId) {
      clearDragState();
      return;
    }
    const side = dragOverSide ?? 'before';
    setTasks((prev) => {
      const siblings = siblingIds(task.parentTaskId);
      const filtered = siblings.filter((id) => id !== dragId);
      const targetIndex = filtered.indexOf(targetId);
      const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
      filtered.splice(insertIndex, 0, dragId);
      const order = new Map(filtered.map((id, idx) => [id, idx]));
      const next = prev.map((t) => (order.has(t.id) ? { ...t, position: order.get(t.id)! } : t));
      startTransition(() => {
        reorderProjectTasksAction(filtered);
      });
      return next;
    });
    clearDragState();
  }

  function handleStatusClick(task: ProjectTask) {
    const nextStatus = NEXT_STATUS[task.status];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    startTransition(async () => {
      const res = await updateProjectTaskStatusAction(task.id, nextStatus);
      if (!res.success) notify(res.message);
    });
  }

  function handleToggleAssignee(task: ProjectTask, userId: string) {
    const user = userOptions.find((u) => u.id === userId);
    if (!user) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        const already = t.assignedToIds.includes(userId);
        return already
          ? { ...t, assignedToIds: t.assignedToIds.filter((id) => id !== userId), assignedToUsers: t.assignedToUsers.filter((u2) => u2.id !== userId) }
          : { ...t, assignedToIds: [...t.assignedToIds, userId], assignedToUsers: [...t.assignedToUsers, user] };
      })
    );
    startTransition(async () => {
      const res = await toggleProjectTaskAssigneeAction(task.id, userId);
      if (!res.success) notify(res.message);
    });
  }

  function handleDelete(task: ProjectTask) {
    const idsToRemove = new Set<string>([task.id]);
    let frontier = [task.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const parentId of frontier) {
        for (const child of childrenByParent.get(parentId) ?? []) {
          if (!idsToRemove.has(child.id)) {
            idsToRemove.add(child.id);
            next.push(child.id);
          }
        }
      }
      frontier = next;
    }
    setTasks((prev) => prev.filter((t) => !idsToRemove.has(t.id)));
    startTransition(async () => {
      const res = await deleteProjectTaskAction(task.id);
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
        style={{ marginLeft: level * 16, width: `calc(100% - ${level * 16}px)` }}
        placeholder="Titolo task..."
        className="field-input rounded border border-grid-border bg-transparent px-2 py-1.5 text-xs text-primary"
      />
    );
  }

  function renderNode(task: ProjectTask, level: number): React.ReactNode {
    const children = childrenByParent.get(task.id) ?? [];
    const isCollapsed = collapsed.has(task.id);
    const isDragTarget = dragOverId === task.id && dragId !== task.id;
    return (
      <div key={task.id} className="flex flex-col gap-1.5">
        {isDragTarget && dragOverSide === 'before' && <DropPlaceholder orientation="vertical" size="34px" />}
        <TaskChip
          task={task}
          level={level}
          hasChildren={children.length > 0}
          collapsed={isCollapsed}
          userOptions={userOptions}
          isDragging={dragId === task.id}
          onToggleCollapse={() => toggleCollapse(task.id)}
          onDragStart={() => setDragId(task.id)}
          onDragEnd={clearDragState}
          onDragOver={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const side: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
            if (dragOverId !== task.id || dragOverSide !== side) {
              setDragOverId(task.id);
              setDragOverSide(side);
            }
          }}
          onDrop={() => handleDrop(task, task.id)}
          onStatusClick={() => handleStatusClick(task)}
          onToggleAssignee={(userId) => handleToggleAssignee(task, userId)}
          onRename={(newTitle) => handleRename(task, newTitle)}
          onDelete={() => handleDelete(task)}
          onAddSubtask={() => {
            setCreatingFor(task.id);
            setTitle('');
            setCollapsed((prev) => { const next = new Set(prev); next.delete(task.id); return next; });
          }}
        />
        {isDragTarget && dragOverSide === 'after' && <DropPlaceholder orientation="vertical" size="34px" />}
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

      {showTrash && (
        <ProjectTaskTrashModal
          projectId={projectId}
          onClose={() => setShowTrash(false)}
          onRestore={(task) => setTasks((prev) => [...prev, task])}
        />
      )}
    </div>
  );
});

export default ProjectTaskList;
