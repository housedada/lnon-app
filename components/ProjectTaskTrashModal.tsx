'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';
import { getProjectTaskTrashAction, restoreProjectTaskAction } from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import type { ProjectTask } from '@/lib/types';

export default function ProjectTaskTrashModal({
  projectId,
  onClose,
  onRestore,
}: {
  projectId: string;
  onClose: () => void;
  onRestore: (task: ProjectTask) => void;
}) {
  const [tasks, setTasks] = useState<ProjectTask[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getProjectTaskTrashAction(projectId).then((res) => {
      if (res.success) setTasks(res.tasks ?? []);
      else {
        notify(res.message);
        setTasks([]);
      }
    });
  }, [projectId]);

  function handleRestore(taskId: string) {
    startTransition(async () => {
      const res = await restoreProjectTaskAction(taskId);
      if (res.success && res.task) {
        setTasks((prev) => (prev ?? []).filter((t) => t.id !== taskId));
        onRestore(res.task);
      }
      notify(res.message);
    });
  }

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-card-bg"
      >
        <div className="modal-header-gradient relative flex shrink-0 items-center justify-between gap-3 overflow-hidden px-8 py-5">
          <ParticleCanvasHeader />
          <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
            <Trash2 size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
            Cestino task
          </h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="relative z-10 text-white/70 transition hover:text-white">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tasks === null && <p className="py-8 text-center text-xs text-secondary">Caricamento...</p>}
          {tasks !== null && tasks.length === 0 && <p className="py-8 text-center text-xs text-secondary">Il cestino è vuoto.</p>}
          {tasks !== null && tasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 rounded border border-grid-border px-2.5 py-2 text-xs">
                  <span className="min-w-0 truncate text-primary">{task.title}</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRestore(task.id)}
                    className="special-action-icon flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition hover:bg-row-hover disabled:opacity-60"
                  >
                    <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
                    Ripristina
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-grid-border px-6 py-3 text-[11px] text-secondary">
          <span className="flex items-center gap-1.5">
            {isPending && <Loader2 size={12} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
            {tasks ? `${tasks.length} elementi` : ''}
          </span>
          <button type="button" onClick={onClose} className="rounded-lg border border-grid-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-row-hover">
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
