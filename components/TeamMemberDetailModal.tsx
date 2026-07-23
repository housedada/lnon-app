'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Briefcase, ChevronDown } from 'lucide-react';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import type { Project, ProjectTask } from '@/lib/types';

/**
 * Dettaglio a tutta larghezza di un singolo membro (vista Team in modalità
 * griglia): stessa interfaccia usata dentro la colonna normale (elenco progetti
 * con ProjectTaskList ciascuno), aperta da un modale invece che dalla card ristretta.
 */
export default function TeamMemberDetailModal({
  member,
  projects,
  tasksByProject,
  userOptions,
  canManageInvoices,
  onClose,
}: {
  member: { id: string; name: string; color?: string };
  projects: Project[];
  tasksByProject: Record<string, ProjectTask[]>;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const listRefs = useRef<Map<string, ProjectTaskListHandle>>(new Map());

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const headerTextClass = member.color ? 'text-neutral-800' : 'text-primary';

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card-bg"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4" style={member.color ? { background: member.color } : undefined}>
          <h2 className={`text-sm font-semibold ${headerTextClass}`}>{member.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className={`transition ${member.color ? 'text-neutral-700 hover:text-neutral-900' : 'text-secondary hover:text-primary'}`}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {projects.length === 0 && <p className="py-8 text-center text-sm text-secondary">Nessun progetto</p>}
          {projects.map((project) => {
            const isCollapsed = collapsed.has(project.id);
            return (
              <div key={project.id} className="rounded-lg border border-grid-border bg-card-bg">
                <div className="flex items-center justify-between gap-2 p-3">
                  <button type="button" onClick={() => toggle(project.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
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
                  {project.jobId && <ProjectShareBadge projectId={project.id} share={project.budgetShare} textClass="text-secondary" />}
                  {project.jobId && canManageInvoices && !project.completedAt && (
                    <MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} budgetShare={project.budgetShare} />
                  )}
                  <button
                    type="button"
                    onClick={() => listRefs.current.get(project.id)?.openTrash()}
                    aria-label="Cestino task"
                    title="Cestino task"
                    className="shrink-0 text-secondary transition hover:text-primary"
                  >
                    <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => toggle(project.id)} className="shrink-0" aria-label={isCollapsed ? 'Espandi progetto' : 'Comprimi progetto'}>
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
    </div>,
    document.body
  );
}
