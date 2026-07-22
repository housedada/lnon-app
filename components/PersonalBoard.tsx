import { Briefcase } from 'lucide-react';
import type { Project } from '@/lib/types';

export default function PersonalBoard({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-secondary">Nessun progetto assegnato a te per ora.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3">
      {projects.map((project) => (
        <div key={project.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg">
          <div className="border-b border-grid-border px-3 py-2">
            <p className="text-sm font-semibold text-primary">{project.title}</p>
            {project.jobTitle && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-secondary">
                <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                {project.jobTitle}
              </p>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-center text-[11px] text-secondary">Task in arrivo</p>
          </div>
        </div>
      ))}
    </div>
  );
}
