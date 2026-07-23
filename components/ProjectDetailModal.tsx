'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Briefcase } from 'lucide-react';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';
import ProjectTaskList, { type ProjectTaskListHandle } from '@/components/ProjectTaskList';
import ProjectShareBadge from '@/components/ProjectShareBadge';
import MarkProjectCompletedButton from '@/components/MarkProjectCompletedButton';
import type { Project, ProjectTask } from '@/lib/types';

/**
 * Dettaglio a tutta larghezza di un singolo progetto (vista Personale in modalità
 * griglia): stessa interfaccia usata nella colonna normale (header + ProjectTaskList),
 * aperta da un modale invece che da una card ristretta a scorrimento orizzontale.
 */
export default function ProjectDetailModal({
  project,
  background,
  initialTasks,
  userOptions,
  canManageInvoices,
  onClose,
}: {
  project: Project;
  background?: string;
  initialTasks: ProjectTask[];
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
  onClose: () => void;
}) {
  const listRef = useRef<ProjectTaskListHandle>(null);
  const headerTextClass = background ? 'text-neutral-800' : 'text-white';
  const headerSubTextClass = background ? 'text-neutral-700/70' : 'text-white/70';

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card-bg"
      >
        <div
          className="modal-header-gradient relative flex items-center justify-between gap-3 overflow-hidden px-6 py-4"
          style={background ? { background } : undefined}
        >
          {!background && <ParticleCanvasHeader />}
          <div className="relative z-10 min-w-0">
            <h2 className={`truncate text-sm font-semibold ${headerTextClass}`}>{project.title}</h2>
            {project.jobTitle && (
              <p className={`mt-0.5 flex items-center gap-1 truncate text-xs ${headerSubTextClass}`}>
                <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                {project.jobTitle}
              </p>
            )}
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2.5">
            {project.jobId && <ProjectShareBadge projectId={project.id} share={project.budgetShare} textClass={headerSubTextClass} />}
            {project.jobId && canManageInvoices && !project.completedAt && (
              <MarkProjectCompletedButton projectId={project.id} projectTitle={project.title} budgetShare={project.budgetShare} />
            )}
            <button
              type="button"
              onClick={() => listRef.current?.openTrash()}
              aria-label="Cestino task"
              title="Cestino task"
              className={`transition ${background ? 'text-neutral-700 hover:text-neutral-900' : 'text-white/70 hover:text-white'}`}
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className={`transition ${background ? 'text-neutral-700 hover:text-neutral-900' : 'text-white/70 hover:text-white'}`}
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ProjectTaskList ref={listRef} projectId={project.id} initialTasks={initialTasks} userOptions={userOptions} />
        </div>
      </div>
    </div>,
    document.body
  );
}
