'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { GripVertical, Briefcase, CheckCircle2, ChevronDown, Trash2 } from 'lucide-react';
import { saveTeamColumnOrderAction } from '@/lib/actions/projects';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useTaskBoardScrollStore } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import DropPlaceholder from '@/components/DropPlaceholder';
import type { Project, ProjectTask } from '@/lib/types';

interface TeamMember {
  id: string;
  name: string;
  color?: string;
}

export default function TeamBoard({
  members,
  projectsByUser,
  tasksByProject,
  userOptions,
  canManageInvoices,
}: {
  members: TeamMember[];
  projectsByUser: Record<string, Project[]>;
  tasksByProject: Record<string, ProjectTask[]>;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const listRefs = useRef<Map<string, ProjectTaskListHandle>>(new Map());

  function toggleProject(projectId: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const [order, setOrder] = useState<string[]>(() => members.map((m) => m.id));
  const [prevMemberIds, setPrevMemberIds] = useState<string[]>(() => members.map((m) => m.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'before' | 'after' | null>(null);
  const [, startTransition] = useTransition();
  const density = useTaskBoardViewStore((s) => s.density);
  const setScrollContainer = useTaskBoardScrollStore((s) => s.setScrollContainer);
  const setColumns = useTaskBoardScrollStore((s) => s.setColumns);
  const registerColumnRef = useTaskBoardScrollStore((s) => s.registerColumnRef);
  const expandSignal = useTaskBoardExpandStore((s) => s.signal);
  const expandTarget = useTaskBoardExpandStore((s) => s.expanded);

  const membersById = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    setColumns(members.map((m) => ({ id: m.id, label: m.name })));
  }, [members, setColumns]);

  useEffect(() => {
    listRefs.current.forEach((handle) => handle.setAllCollapsed(!expandTarget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal]);

  const [prevExpandSignal, setPrevExpandSignal] = useState(expandSignal);
  if (expandSignal !== prevExpandSignal) {
    setPrevExpandSignal(expandSignal);
    const allProjectIds = Object.values(projectsByUser).flat().map((p) => p.id);
    setCollapsedProjects(expandTarget ? new Set() : new Set(allProjectIds));
  }

  // L'ordine locale è seedato una volta da `members`, ma il prop può cambiare dopo
  // il mount (es. toggle dati demo che aggiunge/rimuove colonne): risincronizza
  // aggiungendo i nuovi id in coda e togliendo quelli non più presenti. Pattern
  // "adjust state during render" (niente useEffect/ref) per restare compatibili
  // col linter di questo progetto.
  const currentMemberIds = members.map((m) => m.id);
  const memberIdsChanged =
    currentMemberIds.length !== prevMemberIds.length || currentMemberIds.some((id, i) => id !== prevMemberIds[i]);
  if (memberIdsChanged) {
    setPrevMemberIds(currentMemberIds);
    const kept = order.filter((id) => currentMemberIds.includes(id));
    const added = currentMemberIds.filter((id) => !order.includes(id));
    setOrder([...kept, ...added]);
  }

  function clearDragState() {
    setDragId(null);
    setDragOverId(null);
    setDragOverSide(null);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      clearDragState();
      return;
    }
    const side = dragOverSide ?? 'before';
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      const targetIndex = next.indexOf(targetId);
      const insertIndex = side === 'before' ? targetIndex : targetIndex + 1;
      next.splice(insertIndex, 0, dragId);
      startTransition(() => {
        saveTeamColumnOrderAction(next);
      });
      return next;
    });
    clearDragState();
  }

  const isMasonry = density === 'masonry';
  const containerClass = isMasonry
    ? 'h-full columns-1 gap-3 overflow-y-auto px-4 pb-4 pt-3 sm:columns-2 lg:columns-3 xl:columns-4'
    : 'flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3';
  const cardWidthClass = isMasonry ? 'mb-3 w-full break-inside-avoid' : density === 'wide' ? 'w-[30%] min-w-[400px]' : 'w-[20%] min-w-[400px]';

  return (
    <div className={containerClass} ref={(el) => setScrollContainer(el)}>
      {order.map((userId) => {
        const member = membersById.get(userId);
        if (!member) return null;
        const projects = projectsByUser[userId] ?? [];
        const headerStyle = member.color ? { background: member.color } : undefined;
        const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';
        const headerSubTextClass = member.color ? 'text-neutral-700/70' : 'text-secondary';
        const isDragTarget = !isMasonry && dragOverId === userId && dragId !== userId;

        return (
          <div key={userId} className="contents">
            {isDragTarget && dragOverSide === 'before' && <DropPlaceholder orientation="horizontal" size="28px" />}
            <div
              ref={(el) => registerColumnRef(userId, el)}
              draggable
              onDragStart={() => setDragId(userId)}
              onDragEnd={clearDragState}
              onDragOver={(e) => {
                e.preventDefault();
                if (isMasonry) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const side: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                if (dragOverId !== userId || dragOverSide !== side) {
                  setDragOverId(userId);
                  setDragOverSide(side);
                }
              }}
              onDrop={() => handleDrop(userId)}
              className={`flex shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg transition-opacity duration-150 ${cardWidthClass} ${isMasonry ? '' : 'self-start'} ${dragId === userId ? 'opacity-40' : 'opacity-100'}`}
            >
            <div
              className="flex cursor-grab items-center gap-1.5 rounded-t-xl border-b border-grid-border px-3 py-2 active:cursor-grabbing"
              style={headerStyle}
            >
              <GripVertical size={14} strokeWidth={1.75} className={headerSubTextClass} aria-hidden="true" />
              <span className={`text-sm font-semibold ${headerTextClass}`}>{member.name}</span>
              <span className={`ml-auto text-[10px] ${headerSubTextClass}`}>{projects.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {projects.length === 0 && <p className="px-2 py-4 text-center text-[11px] text-secondary">Nessun progetto</p>}
              {projects.map((project) => {
                const isCollapsed = collapsedProjects.has(project.id);
                return (
                  <div key={project.id} className="card-shadow group rounded-lg border border-grid-border bg-card-bg">
                    <div className="flex w-full items-center justify-between gap-2 p-3">
                      <button type="button" onClick={() => toggleProject(project.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-primary">{project.title}</p>
                          {project.jobTitle && (
                            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-secondary">
                              <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                              {project.jobTitle}
                            </p>
                          )}
                        </div>
                      </button>
                      {project.jobId && (
                        <ProjectShareBadge projectId={project.id} share={project.budgetShare} textClass="text-secondary" />
                      )}
                      {project.jobId && canManageInvoices && (
                        project.completedAt ? (
                          <span title="Progetto completato" className="shrink-0">
                            <CheckCircle2 size={13} strokeWidth={1.75} className="text-secondary" aria-label="Progetto completato" />
                          </span>
                        ) : (
                          <MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} budgetShare={project.budgetShare} />
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => listRefs.current.get(project.id)?.openTrash()}
                        aria-label="Cestino task"
                        title="Cestino task"
                        className="shrink-0 text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                      >
                        <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => toggleProject(project.id)} className="shrink-0" aria-label={isCollapsed ? 'Espandi progetto' : 'Comprimi progetto'}>
                        <ChevronDown
                          size={14}
                          strokeWidth={2}
                          className={`text-secondary transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    <div className={`border-t border-grid-border p-2 ${isCollapsed ? 'hidden' : ''}`}>
                      <ProjectTaskList
                        ref={(el) => {
                          if (el) listRefs.current.set(project.id, el);
                          else listRefs.current.delete(project.id);
                        }}
                        projectId={project.id}
                        initialTasks={tasksByProject[project.id] ?? []}
                        userOptions={userOptions}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {isDragTarget && dragOverSide === 'after' && <DropPlaceholder orientation="horizontal" size="28px" />}
          </div>
        );
      })}

      {order.length === 0 && (
        <p className="px-6 py-12 text-sm text-secondary">
          Nessun membro del team attivo.{' '}
          <Link href="/dashboard/users" className="underline">
            Gestisci utenti
          </Link>
        </p>
      )}
    </div>
  );
}
