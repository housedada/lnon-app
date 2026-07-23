'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import { Briefcase, CheckCircle2, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useTaskBoardScrollStore } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';
import { savePersonalColumnOrderAction } from '@/lib/actions/projects';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import SortableColumn from '@/components/SortableColumn';
import type { Project, ProjectTask } from '@/lib/types';

function projectHeaderBackground(project: Project, productColorsByJob: Record<string, string[]>): string | undefined {
  const colors = project.jobId ? productColorsByJob[project.jobId] : undefined;
  if (!colors || colors.length === 0) return undefined;
  return colors.length === 1 ? colors[0] : `linear-gradient(135deg, ${colors.join(', ')})`;
}

export default function PersonalBoard({
  projects,
  productColorsByJob,
  tasksByProject,
  userOptions,
  canManageInvoices,
}: {
  projects: Project[];
  productColorsByJob: Record<string, string[]>;
  tasksByProject: Record<string, ProjectTask[]>;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  const density = useTaskBoardViewStore((s) => s.density);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const listRefs = useRef<Map<string, ProjectTaskListHandle>>(new Map());
  const [order, setOrder] = useState<string[]>(() => projects.map((p) => p.id));
  const [prevProjectIds, setPrevProjectIds] = useState<string[]>(() => projects.map((p) => p.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const setScrollContainer = useTaskBoardScrollStore((s) => s.setScrollContainer);
  const setColumns = useTaskBoardScrollStore((s) => s.setColumns);
  const registerColumnRef = useTaskBoardScrollStore((s) => s.registerColumnRef);
  const expandSignal = useTaskBoardExpandStore((s) => s.signal);
  const expandTarget = useTaskBoardExpandStore((s) => s.expanded);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  useEffect(() => {
    setColumns(projects.map((p) => ({ id: p.id, label: p.title, background: projectHeaderBackground(p, productColorsByJob) })));
  }, [projects, productColorsByJob, setColumns]);

  useEffect(() => {
    listRefs.current.forEach((handle) => handle.setAllCollapsed(!expandTarget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal]);

  const [prevExpandSignal, setPrevExpandSignal] = useState(expandSignal);
  if (expandSignal !== prevExpandSignal) {
    setPrevExpandSignal(expandSignal);
    setCollapsedProjects(expandTarget ? new Set() : new Set(projects.map((p) => p.id)));
  }

  // L'ordine locale è seedato una volta da `projects`, ma il prop può cambiare dopo
  // il mount (es. toggle dati demo che aggiunge/rimuove colonne): risincronizza
  // aggiungendo i nuovi id in coda e togliendo quelli non più presenti. Pattern
  // "adjust state during render" (niente useEffect/ref) per restare compatibili
  // col linter di questo progetto.
  const currentProjectIds = projects.map((p) => p.id);
  const projectIdsChanged =
    currentProjectIds.length !== prevProjectIds.length || currentProjectIds.some((id, i) => id !== prevProjectIds[i]);
  if (projectIdsChanged) {
    setPrevProjectIds(currentProjectIds);
    const kept = order.filter((id) => currentProjectIds.includes(id));
    const added = currentProjectIds.filter((id) => !order.includes(id));
    setOrder([...kept, ...added]);
  }

  function toggleProject(projectId: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
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
        savePersonalColumnOrderAction(next);
      });
      return next;
    });
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-secondary">Nessun progetto assegnato a te per ora.</p>
      </div>
    );
  }

  const isMasonry = density === 'masonry';
  const containerClass = isMasonry
    ? 'h-full columns-1 gap-3 overflow-y-auto px-4 pb-4 pt-3 sm:columns-2 lg:columns-3 xl:columns-4'
    : 'flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3';
  const cardWidthClass = isMasonry ? 'mb-3 w-full break-inside-avoid' : density === 'wide' ? 'w-[30%] min-w-[400px]' : 'w-[20%] min-w-[400px]';

  const orderedProjects = order.map((id) => projectsById.get(id)).filter((p): p is Project => Boolean(p));
  const activeProject = activeId ? projectsById.get(activeId) : undefined;
  const activeBackground = activeProject ? projectHeaderBackground(activeProject, productColorsByJob) : undefined;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={containerClass} ref={(el) => setScrollContainer(el)}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          {orderedProjects.map((project) => {
            const background = projectHeaderBackground(project, productColorsByJob);
            const headerStyle = background ? { background } : undefined;
            const headerTextClass = headerStyle ? 'text-neutral-800' : 'text-primary';
            const headerSubTextClass = headerStyle ? 'text-neutral-700/70' : 'text-secondary';
            const isCollapsed = collapsedProjects.has(project.id);

            return (
              <SortableColumn key={project.id} id={project.id} disabled={isMasonry}>
                {({ setNodeRef, setActivatorNodeRef, style, attributes, listeners, isDragging }) => (
                  <div
                    ref={(el) => {
                      setNodeRef(el);
                      registerColumnRef(project.id, el);
                    }}
                    style={style}
                    className={`group flex shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg transition-opacity duration-150 ${cardWidthClass} ${isMasonry ? '' : 'self-start'} ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div
                      className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b border-grid-border px-3 py-2"
                      style={headerStyle}
                    >
                      <span
                        ref={setActivatorNodeRef}
                        {...attributes}
                        {...listeners}
                        className={`shrink-0 cursor-grab touch-none active:cursor-grabbing ${headerSubTextClass}`}
                      >
                        <GripVertical size={13} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <button type="button" onClick={() => toggleProject(project.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${headerTextClass}`}>{project.title}</p>
                          {project.jobTitle && (
                            <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${headerSubTextClass}`}>
                              <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                              {project.jobTitle}
                            </p>
                          )}
                        </div>
                      </button>
                      {project.jobId && (
                        <ProjectShareBadge projectId={project.id} share={project.budgetShare} textClass={headerSubTextClass} />
                      )}
                      {project.jobId && canManageInvoices && (
                        project.completedAt ? (
                          <span title="Progetto completato" className="shrink-0">
                            <CheckCircle2 size={13} strokeWidth={1.75} className={headerTextClass} aria-label="Progetto completato" />
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
                        className={`shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${headerTextClass}`}
                      >
                        <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => toggleProject(project.id)} className="shrink-0" aria-label={isCollapsed ? 'Espandi progetto' : 'Comprimi progetto'}>
                        <ChevronDown
                          size={14}
                          strokeWidth={2}
                          className={`transition-transform ${headerTextClass} ${isCollapsed ? '-rotate-90' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                    <div className={`flex-1 p-2 ${isCollapsed ? 'hidden' : ''}`}>
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
                )}
              </SortableColumn>
            );
          })}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeProject && (
          <div className={`rounded-xl border border-grid-border bg-grid-header-bg shadow-lg ${cardWidthClass}`}>
            <div className="rounded-xl px-3 py-2" style={activeBackground ? { background: activeBackground } : undefined}>
              <p className={`truncate text-sm font-semibold ${activeBackground ? 'text-neutral-800' : 'text-primary'}`}>{activeProject.title}</p>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
