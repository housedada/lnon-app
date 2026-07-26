'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
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
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { GripVertical, Briefcase, CheckCircle2, ChevronDown, CircleDot, Clock, ListChecks, Trash2, Plus } from 'lucide-react';
import { saveTeamColumnOrderAction } from '@/lib/actions/projects';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useTaskBoardScrollStore } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';
import { useSpecialProjectsVisibilityStore } from '@/lib/store/specialProjectsVisibilityStore';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import SortableColumn from '@/components/SortableColumn';
import TeamMemberDetailModal from '@/components/TeamMemberDetailModal';
import { productBorderStyle } from '@/lib/productBorder';
import type { Project, ProjectTask } from '@/lib/types';

interface TeamMember {
  id: string;
  name: string;
  color?: string;
}

export default function TeamBoard({
  members,
  projectsByUser: rawProjectsByUser,
  productColorsByJob,
  tasksByProject,
  userOptions,
  canManageInvoices,
}: {
  members: TeamMember[];
  projectsByUser: Record<string, Project[]>;
  productColorsByJob: Record<string, string[]>;
  tasksByProject: Record<string, ProjectTask[]>;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  const specialProjectsVisible = useSpecialProjectsVisibilityStore((s) => s.visible);
  const projectsByUser: Record<string, Project[]> = useMemo(() => {
    // Un progetto a conteggio orario "in riposo" (completato) sparisce dalla board:
    // si riattiva da solo, ricomparendo, quando arriva una nuova lavorazione.
    const withoutRestingHourly = Object.fromEntries(
      Object.entries(rawProjectsByUser).map(([uid, ps]) => [uid, ps.filter((p) => !(p.isSystemGenerated && p.completedAt))])
    );
    return specialProjectsVisible
      ? withoutRestingHourly
      : Object.fromEntries(Object.entries(withoutRestingHourly).map(([uid, ps]) => [uid, ps.filter((p) => !p.isSystemGenerated)]));
  }, [rawProjectsByUser, specialProjectsVisible]);

  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(new Set());
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

  function toggleMember(userId: string) {
    setCollapsedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={containerClass}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            {order.map((userId) => {
              const member = membersById.get(userId);
              if (!member) return null;
              const memberProjects = projectsByUser[userId] ?? [];
              const headerStyle = member.color ? { background: member.color } : undefined;
              const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';
              const stats = memberStats(userId);

              return (
                <SortableColumn key={userId} id={userId}>
                  {({ setNodeRef, setActivatorNodeRef, style, attributes, listeners, isDragging }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      onClick={() => setDetailMemberId(userId)}
                      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-grid-border bg-card-bg text-left transition-[opacity,border-color] duration-150 hover:border-secondary ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <span
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Trascina per riordinare"
                        className="absolute left-4 top-4 z-10 flex h-5 w-5 shrink-0 cursor-grab touch-none items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 active:cursor-grabbing"
                      >
                        <GripVertical size={14} strokeWidth={1.75} className={headerTextClass} aria-hidden="true" />
                      </span>
                      <span
                        className="pointer-events-none absolute right-4 top-4 z-10 opacity-0 -translate-x-1.5 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0"
                        aria-hidden="true"
                      >
                        <Plus size={14} strokeWidth={2} className={headerTextClass} />
                      </span>
                      <div className="shrink-0 p-3" style={headerStyle}>
                        <p className={`truncate px-6 text-center text-sm font-semibold ${headerTextClass}`}>{member.name}</p>
                      </div>

                      <div className="relative min-h-0 flex-1">
                        <div className="flex flex-col">
                          {memberProjects.length === 0 && <p className="px-3 py-2 text-xs text-secondary">Nessun progetto</p>}
                          {memberProjects.slice(0, 5).map((project) => {
                            const counts = projectTaskCounts(project.id);
                            return (
                              <div key={project.id} className="relative flex items-center border-b border-grid-border px-3 py-2.5 pr-12">
                                <p className="truncate text-xs text-secondary">{project.title}</p>
                                <span className="task-count-badge absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
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
                    </div>
                  )}
                </SortableColumn>
              );
            })}
          </SortableContext>

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

        <DragOverlay>
          {activeMember && (
            <div className="rounded-xl border border-grid-border bg-card-bg shadow-lg" style={{ width: 200, height: 300 }}>
              <div className="rounded-t-xl p-3" style={activeMember.color ? { background: activeMember.color } : undefined}>
                <p className={`truncate text-center text-sm font-semibold ${activeMember.color ? 'text-neutral-800' : 'text-primary'}`}>{activeMember.name}</p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  if (density === 'list') {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full flex-col gap-3 overflow-y-auto px-4 pb-4 pt-3" ref={(el) => setScrollContainer(el)}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {order.map((userId) => {
              const member = membersById.get(userId);
              if (!member) return null;
              const memberProjects = projectsByUser[userId] ?? [];
              const headerStyle = member.color ? { background: member.color } : undefined;
              const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';
              const headerSubTextClass = member.color ? 'text-neutral-700/70' : 'text-secondary';
              const stats = memberStats(userId);
              const isMemberCollapsed = collapsedMembers.has(userId);

              return (
                <SortableColumn key={userId} id={userId}>
                  {({ setNodeRef, setActivatorNodeRef, style, attributes, listeners, isDragging }) => (
                    <div
                      ref={(el) => {
                        setNodeRef(el);
                        registerColumnRef(userId, el);
                      }}
                      style={style}
                      className={`flex w-full flex-col rounded-xl border border-grid-border bg-grid-header-bg transition-opacity duration-150 ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                    >
                      <div className="flex w-full items-center gap-4 rounded-t-xl border-b border-grid-border px-5 py-4" style={headerStyle}>
                        <span
                          ref={setActivatorNodeRef}
                          {...attributes}
                          {...listeners}
                          className={`shrink-0 cursor-grab touch-none active:cursor-grabbing ${headerSubTextClass}`}
                        >
                          <GripVertical size={22} strokeWidth={1.75} aria-hidden="true" />
                        </span>
                        <button type="button" onClick={() => toggleMember(userId)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                          <p className={`truncate font-medium ${headerTextClass}`} style={{ fontSize: '26px', lineHeight: 1.25 }}>
                            {member.name}
                          </p>
                        </button>
                        <div className={`hidden shrink-0 items-center gap-4 md:flex ${headerTextClass}`}>
                          <span title="Progetti" className="flex items-center gap-1.5 text-sm font-medium">
                            <Briefcase size={17} strokeWidth={1.75} aria-hidden="true" />
                            {stats.projectCount}
                          </span>
                          <span title="Task totali" className="flex items-center gap-1.5 text-sm font-medium">
                            <ListChecks size={17} strokeWidth={1.75} aria-hidden="true" />
                            {stats.total}
                          </span>
                          <span title="Task aperti" className="flex items-center gap-1.5 text-sm font-medium">
                            <CircleDot size={17} strokeWidth={1.75} aria-hidden="true" />
                            {stats.toResolve}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleMember(userId)}
                          className="shrink-0"
                          aria-label={isMemberCollapsed ? 'Espandi membro' : 'Comprimi membro'}
                        >
                          <ChevronDown
                            size={22}
                            strokeWidth={2}
                            className={`transition-transform ${headerTextClass} ${isMemberCollapsed ? '-rotate-90' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <div className={`flex flex-col gap-2 p-3 ${isMemberCollapsed ? 'hidden' : ''}`}>
                        {memberProjects.length === 0 && <p className="px-2 py-4 text-center text-xs text-secondary">Nessun progetto</p>}
                        {memberProjects.map((project) => {
                          const isCollapsed = collapsedProjects.has(project.id);
                          const isSpecial = project.isSystemGenerated;
                          const productColors = project.jobId ? productColorsByJob[project.jobId] : undefined;
                          const borderStyle = !isSpecial ? productBorderStyle(productColors, project.id) : undefined;
                          const counts = projectTaskCounts(project.id);
                          return (
                            <div
                              key={project.id}
                              style={borderStyle}
                              className={`rounded-lg border bg-card-bg ${isSpecial ? 'special-project-border' : borderStyle ? '' : 'border-grid-border'}`}
                            >
                              <div className={`flex w-full items-center gap-3 rounded-t-lg px-4 py-3 ${isSpecial ? 'special-project-header' : ''}`}>
                                <button type="button" onClick={() => toggleProject(project.id)} className="relative flex min-w-0 flex-1 items-center gap-2 text-left">
                                  <div className="min-w-0">
                                    <p className={`truncate text-base font-medium ${isSpecial ? 'text-neutral-800' : 'text-primary'}`}>{project.title}</p>
                                    {project.jobTitle && (
                                      <p className={`mt-1 flex items-center gap-1.5 truncate text-xs ${isSpecial ? 'text-neutral-700/70' : 'text-secondary'}`}>
                                        <Briefcase size={12} strokeWidth={1.75} aria-hidden="true" />
                                        {project.jobTitle}
                                      </p>
                                    )}
                                  </div>
                                </button>
                                <div className={`relative hidden shrink-0 items-center gap-3 md:flex ${isSpecial ? 'text-neutral-800' : 'text-secondary'}`}>
                                  <span title="Task totali" className="flex items-center gap-1 text-xs font-medium">
                                    <ListChecks size={14} strokeWidth={1.75} aria-hidden="true" />
                                    {counts.total}
                                  </span>
                                  <span title="Task aperti" className="flex items-center gap-1 text-xs font-medium">
                                    <CircleDot size={14} strokeWidth={1.75} aria-hidden="true" />
                                    {counts.total - counts.resolved}
                                  </span>
                                </div>
                                {isSpecial && (
                                  <span title="Progetto a conteggio orario" className="relative shrink-0 text-neutral-800">
                                    <Clock size={15} strokeWidth={1.75} aria-hidden="true" />
                                  </span>
                                )}
                                {project.jobId && (canManageInvoices || isSpecial) && (
                                  <span className="relative shrink-0">
                                    {project.completedAt ? (
                                      <span title="Progetto completato">
                                        <CheckCircle2 size={15} strokeWidth={1.75} className={isSpecial ? 'text-neutral-800' : 'text-secondary'} aria-label="Progetto completato" />
                                      </span>
                                    ) : (
                                      <MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} isHourlyContract={isSpecial} />
                                    )}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => listRefs.current.get(project.id)?.openTrash()}
                                  aria-label="Cestino task"
                                  title="Cestino task"
                                  className={`relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${isSpecial ? 'text-neutral-800' : 'text-secondary hover:text-primary'}`}
                                >
                                  <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => toggleProject(project.id)} className="relative shrink-0" aria-label={isCollapsed ? 'Espandi progetto' : 'Comprimi progetto'}>
                                  <ChevronDown
                                    size={18}
                                    strokeWidth={2}
                                    className={`${isSpecial ? 'text-neutral-800' : 'text-secondary'} transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
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
            <div className="w-full rounded-xl border border-grid-border bg-grid-header-bg shadow-lg" style={activeMember.color ? { background: activeMember.color } : undefined}>
              <div className="flex items-center gap-3 rounded-xl px-5 py-4">
                <GripVertical size={22} strokeWidth={1.75} className={activeMember.color ? 'text-neutral-700/70' : 'text-secondary'} aria-hidden="true" />
                <p className={`truncate font-medium ${activeMember.color ? 'text-neutral-800' : 'text-primary'}`} style={{ fontSize: '26px' }}>
                  {activeMember.name}
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
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
                        const isSpecial = project.isSystemGenerated;
                        const productColors = project.jobId ? productColorsByJob[project.jobId] : undefined;
                        const borderStyle = !isSpecial ? productBorderStyle(productColors, project.id) : undefined;
                        return (
                          <div
                            key={project.id}
                            style={borderStyle}
                            className={`card-shadow group rounded-lg border bg-card-bg ${isSpecial ? 'special-project-border' : borderStyle ? '' : 'border-grid-border'}`}
                          >
                            <div className={`flex w-full items-center justify-between gap-2 rounded-t-lg p-3 ${isSpecial ? 'special-project-header' : ''}`}>
                              <button type="button" onClick={() => toggleProject(project.id)} className="relative flex min-w-0 flex-1 items-center gap-2 text-left">
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-medium ${isSpecial ? 'text-neutral-800' : 'text-primary'}`}>{project.title}</p>
                                  {project.jobTitle && (
                                    <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${isSpecial ? 'text-neutral-700/70' : 'text-secondary'}`}>
                                      <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                                      {project.jobTitle}
                                    </p>
                                  )}
                                </div>
                              </button>
                              {isSpecial && (
                                <span title="Progetto a conteggio orario" className="relative shrink-0 text-neutral-800">
                                  <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                                </span>
                              )}
                              {project.jobId && (canManageInvoices || isSpecial) && (
                                <span className="relative shrink-0">
                                  {project.completedAt ? (
                                    <span title="Progetto completato">
                                      <CheckCircle2 size={13} strokeWidth={1.75} className={isSpecial ? 'text-neutral-800' : 'text-secondary'} aria-label="Progetto completato" />
                                    </span>
                                  ) : (
                                    <MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} isHourlyContract={isSpecial} />
                                  )}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => listRefs.current.get(project.id)?.openTrash()}
                                aria-label="Cestino task"
                                title="Cestino task"
                                className={`relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${isSpecial ? 'text-neutral-800' : 'text-secondary hover:text-primary'}`}
                              >
                                <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => toggleProject(project.id)} className="relative shrink-0" aria-label={isCollapsed ? 'Espandi progetto' : 'Comprimi progetto'}>
                                <ChevronDown
                                  size={14}
                                  strokeWidth={2}
                                  className={`${isSpecial ? 'text-neutral-800' : 'text-secondary'} transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
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
