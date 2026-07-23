'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Briefcase, CheckCircle2, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useTaskBoardScrollStore } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';
import { savePersonalColumnOrderAction } from '@/lib/actions/projects';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import DropPlaceholder from '@/components/DropPlaceholder';
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'before' | 'after' | null>(null);
  const [, startTransition] = useTransition();
  const setScrollContainer = useTaskBoardScrollStore((s) => s.setScrollContainer);
  const setColumns = useTaskBoardScrollStore((s) => s.setColumns);
  const registerColumnRef = useTaskBoardScrollStore((s) => s.registerColumnRef);
  const expandSignal = useTaskBoardExpandStore((s) => s.signal);
  const expandTarget = useTaskBoardExpandStore((s) => s.expanded);

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
        savePersonalColumnOrderAction(next);
      });
      return next;
    });
    clearDragState();
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

  return (
    <div className={containerClass} ref={(el) => setScrollContainer(el)}>
      {orderedProjects.map((project) => {
        const background = projectHeaderBackground(project, productColorsByJob);
        const headerStyle = background ? { background } : undefined;
        const headerTextClass = headerStyle ? 'text-neutral-800' : 'text-primary';
        const headerSubTextClass = headerStyle ? 'text-neutral-700/70' : 'text-secondary';
        const isCollapsed = collapsedProjects.has(project.id);
        const isDragTarget = !isMasonry && dragOverId === project.id && dragId !== project.id;

        return (
          <div key={project.id} className="contents">
          {isDragTarget && dragOverSide === 'before' && <DropPlaceholder orientation="horizontal" size="28px" />}
          <div
            ref={(el) => registerColumnRef(project.id, el)}
            draggable
            onDragStart={() => setDragId(project.id)}
            onDragEnd={clearDragState}
            onDragOver={(e) => {
              e.preventDefault();
              if (isMasonry) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const side: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
              if (dragOverId !== project.id || dragOverSide !== side) {
                setDragOverId(project.id);
                setDragOverSide(side);
              }
            }}
            onDrop={() => handleDrop(project.id)}
            className={`group flex shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg transition-opacity duration-150 ${cardWidthClass} ${isMasonry ? '' : 'self-start'} ${dragId === project.id ? 'opacity-40' : 'opacity-100'}`}
          >
            <div
              className="flex w-full cursor-grab items-center justify-between gap-2 rounded-t-xl border-b border-grid-border px-3 py-2 active:cursor-grabbing"
              style={headerStyle}
            >
              <GripVertical size={13} strokeWidth={1.75} className={`shrink-0 ${headerSubTextClass}`} aria-hidden="true" />
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
          {isDragTarget && dragOverSide === 'after' && <DropPlaceholder orientation="horizontal" size="28px" />}
          </div>
        );
      })}
    </div>
  );
}
