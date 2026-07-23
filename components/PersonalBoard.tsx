'use client';

import { useState } from 'react';
import { Briefcase, ChevronDown } from 'lucide-react';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import ProjectTaskList from '@/components/ProjectTaskList';
import type { Project, ProjectTask } from '@/lib/types';

export default function PersonalBoard({
  projects,
  productColorsByJob,
  tasksByProject,
  userOptions,
}: {
  projects: Project[];
  productColorsByJob: Record<string, string[]>;
  tasksByProject: Record<string, ProjectTask[]>;
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const density = useTaskBoardViewStore((s) => s.density);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  function toggleProject(projectId: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
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
  const cardWidthClass = isMasonry ? 'mb-3 w-full break-inside-avoid' : density === 'wide' ? 'w-[23%] min-w-[240px]' : 'w-48';

  return (
    <div className={containerClass}>
      {projects.map((project) => {
        const colors = project.jobId ? productColorsByJob[project.jobId] : undefined;
        const headerStyle =
          colors && colors.length > 0
            ? colors.length === 1
              ? { background: colors[0] }
              : { background: `linear-gradient(135deg, ${colors.join(', ')})` }
            : undefined;
        const headerTextClass = headerStyle ? 'text-neutral-800' : 'text-primary';
        const headerSubTextClass = headerStyle ? 'text-neutral-700/70' : 'text-secondary';
        const isCollapsed = collapsedProjects.has(project.id);

        return (
          <div
            key={project.id}
            className={`group flex shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg ${cardWidthClass} ${isMasonry ? '' : 'self-start'}`}
          >
            <button
              type="button"
              onClick={() => toggleProject(project.id)}
              className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b border-grid-border px-3 py-2 text-left"
              style={headerStyle}
            >
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${headerTextClass}`}>{project.title}</p>
                {project.jobTitle && (
                  <p className={`mt-1 flex items-center gap-1 truncate text-[11px] ${headerSubTextClass}`}>
                    <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                    {project.jobTitle}
                  </p>
                )}
              </div>
              <ChevronDown
                size={14}
                strokeWidth={2}
                className={`shrink-0 transition-transform ${headerTextClass} ${isCollapsed ? '-rotate-90' : ''}`}
                aria-hidden="true"
              />
            </button>
            {!isCollapsed && (
              <div className="flex-1 p-2">
                <ProjectTaskList projectId={project.id} initialTasks={tasksByProject[project.id] ?? []} userOptions={userOptions} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
