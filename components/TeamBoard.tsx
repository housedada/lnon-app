'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { GripVertical, Briefcase, CheckCircle2, ChevronDown, Trash2, Plus } from 'lucide-react';
import { saveTeamColumnOrderAction } from '@/lib/actions/projects';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useTaskBoardScrollStore } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import SortableColumn from '@/components/SortableColumn';
import TeamMemberDetailModal from '@/components/TeamMemberDetailModal';
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
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const density = useTaskBoardViewStore((s) => s.density);
  const setScrollContainer = useTaskBoardScrollStore((s) => s.setScrollContainer);
  const setColumns = useTaskBoardScrollStore((s) => s.setColumns);
  const registerColumnRef = useTaskBoardScrollStore((s) => s.registerColumnRef);
  const expandSignal = useTaskBoardExpandStore((s) => s.signal);
  const expandTarget = useTaskBoardExpandStore((s) => s.expanded);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const membersById = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    setColumns(members.map((m) => ({ id: m.id, label: m.name, background: m.color })));
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

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      startTransition(() => {
        saveTeamColumnOrderAction(next);
      });
      return next;
    });
  }

  function projectTaskCounts(projectId: string) {
    const projectTasks = tasksByProject[projectId] ?? [];
    const total = projectTasks.length;
    const resolved = projectTasks.filter((t) => t.status === 'completed').length;
    return { total, resolved };
  }

  function memberStats(userId: string) {
    const memberProjects = projectsByUser[userId] ?? [];
    let total = 0;
    let toResolve = 0;
    for (const project of memberProjects) {
      const counts = projectTaskCounts(project.id);
      total += counts.total;
      toResolve += counts.total - counts.resolved;
    }
    return { projectCount: memberProjects.length, total, toResolve };
  }

  const isGrid = density === 'masonry';
  const containerClass = isGrid
    ? 'grid h-full auto-rows-[300px] grid-cols-2 content-start gap-3 overflow-y-auto px-4 pb-4 pt-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    : 'flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3';
  const cardWidthClass = density === 'wide' ? 'w-[30%] min-w-[400px]' : 'w-[20%] min-w-[400px]';

  const activeMember = activeId ? membersById.get(activeId) : undefined;
  const detailMember = detailMemberId ? membersById.get(detailMemberId) : undefined;

  if (isGrid) {
    return (
      <div className={containerClass}>
        {order.map((userId) => {
          const member = membersById.get(userId);
          if (!member) return null;
          const memberProjects = projectsByUser[userId] ?? [];
          const headerStyle = member.color ? { background: member.color } : undefined;
          const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';
          const stats = memberStats(userId);

          return (
            <button
              type="button"
              key={userId}
              onClick={() => setDetailMemberId(userId)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-grid-border bg-card-bg text-left transition hover:border-secondary"
            >
              <span
                className="pointer-events-none absolute right-4 top-4 z-10 opacity-0 -translate-x-1.5 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0"
                aria-hidden="true"
              >
                <Plus size={14} strokeWidth={2} className={headerTextClass} />
              </span>
              <div className="shrink-0 p-3" style={headerStyle}>
                <p className={`truncate pr-6 text-sm font-semibold ${headerTextClass}`}>{member.name}</p>
              </div>

              <div className="relative min-h-0 flex-1">
                <div className="flex flex-col divide-y divide-grid-border px-3">
                  {memberProjects.length === 0 && <p className="py-2 text-[13px] text-secondary">Nessun progetto</p>}
                  {memberProjects.slice(0, 5).map((project) => {
                    const counts = projectTaskCounts(project.id);
                    return (
                      <div key={project.id} className="relative flex items-center py-1.5 pr-12">
                        <p className="truncate text-[13px] text-secondary">{project.title}</p>
                        <span
                          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'color-mix(in srgb, var(--accent-to) 12%, transparent)', color: 'var(--accent-to)' }}
                        >
                          {counts.resolved}/{counts.total}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="absolute inset-x-0 bottom-0 flex h-14 items-end"
                  style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-card-bg) 0%, transparent), var(--color-card-bg) 55%)' }}
                >
                  <div className="grid w-full grid-cols-3 divide-x divide-grid-border border-t border-grid-border">
                    <div className="px-1 py-1.5 text-center">
                      <p className="text-base font-bold text-primary">{stats.projectCount}</p>
                      <p className="detail-label">Progetti</p>
                    </div>
                    <div className="px-1 py-1.5 text-center">
                      <p className="text-base font-bold text-primary">{stats.total}</p>
                      <p className="detail-label">Task</p>
                    </div>
                    <div className="px-1 py-1.5 text-center">
                      <p className="text-base font-bold text-primary">{stats.toResolve}</p>
                      <p className="detail-label">Da fare</p>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {order.length === 0 && (
          <p className="col-span-full px-6 py-12 text-sm text-secondary">
            Nessun membro del team attivo.{' '}
            <Link href="/dashboard/users" className="underline">
              Gestisci utenti
            </Link>
          </p>
        )}

        {detailMember && (
          <TeamMemberDetailModal
            member={detailMember}
            projects={projectsByUser[detailMember.id] ?? []}
            tasksByProject={tasksByProject}
            userOptions={userOptions}
            canManageInvoices={canManageInvoices}
            onClose={() => setDetailMemberId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={containerClass} ref={(el) => setScrollContainer(el)}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          {order.map((userId) => {
            const member = membersById.get(userId);
            if (!member) return null;
            const projects = projectsByUser[userId] ?? [];
            const headerStyle = member.color ? { background: member.color } : undefined;
            const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';
            const headerSubTextClass = member.color ? 'text-neutral-700/70' : 'text-secondary';

            return (
              <SortableColumn key={userId} id={userId}>
                {({ setNodeRef, setActivatorNodeRef, style, attributes, listeners, isDragging }) => (
                  <div
                    ref={(el) => {
                      setNodeRef(el);
                      registerColumnRef(userId, el);
                    }}
                    style={style}
                    className={`flex shrink-0 flex-col self-start rounded-xl border border-grid-border bg-grid-header-bg transition-opacity duration-150 ${cardWidthClass} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-t-xl border-b border-grid-border px-3 py-2"
                      style={headerStyle}
                    >
                      <span
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none active:cursor-grabbing"
                      >
                        <GripVertical size={14} strokeWidth={1.75} className={headerSubTextClass} aria-hidden="true" />
                      </span>
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
                )}
              </SortableColumn>
            );
          })}
        </SortableContext>

        {order.length === 0 && (
          <p className="px-6 py-12 text-sm text-secondary">
            Nessun membro del team attivo.{' '}
            <Link href="/dashboard/users" className="underline">
              Gestisci utenti
            </Link>
          </p>
        )}
      </div>

      <DragOverlay>
        {activeMember && (
          <div
            className={`rounded-xl border border-grid-border bg-grid-header-bg shadow-lg ${cardWidthClass}`}
            style={activeMember.color ? { background: activeMember.color } : undefined}
          >
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2">
              <GripVertical size={14} strokeWidth={1.75} className={activeMember.color ? 'text-neutral-700/70' : 'text-secondary'} aria-hidden="true" />
              <span className={`text-sm font-semibold ${activeMember.color ? 'text-neutral-800' : 'text-primary'}`}>{activeMember.name}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
