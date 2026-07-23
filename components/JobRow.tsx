'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, FolderPlus, ListTodo, Trash2, Bug } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import JobRowSelectCheckbox from '@/components/JobRowSelectCheckbox';
import CreateProjectFromJobButton from '@/components/CreateProjectFromJobButton';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';
import JobLinkButton from '@/components/JobLinkButton';
import ApproveJobButton from '@/components/ApproveJobButton';
import ArchiveJobButton from '@/components/ArchiveJobButton';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteJobFromListAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';
import type { Job, JobStatus } from '@/lib/types';

const STATUS_LABEL: Record<JobStatus, string> = {
  draft: 'Bozza',
  pending_approval: 'In attesa',
  approved: 'Approvato',
  in_progress: 'In corso',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const STATUS_BADGE: Record<JobStatus, string> = {
  draft: 'bg-grid-header-bg text-secondary',
  pending_approval: 'bg-amber-500/10 text-amber-700',
  approved: 'bg-yellow-300/20 text-yellow-700',
  in_progress: 'bg-blue-600/10 text-blue-700',
  completed: 'bg-green-600/10 text-green-700',
  cancelled: 'bg-red-600/10 text-red-700',
};

function formatAmount(value?: number) {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

type ModalKind = 'project' | 'delete' | null;

export default function JobRow({
  job,
  canCreateProjects,
  canUpdate,
  canApprove,
  canDelete,
  isSuperadmin,
  clientOptions,
  userOptions,
}: {
  job: Job;
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const [modal, setModal] = useState<ModalKind>(null);
  const router = useRouter();

  async function handleDeleteConfirm() {
    const res = await deleteJobFromListAction(job.id);
    notify(res.message);
    setModal(null);
    if (res.success) router.refresh();
  }

  function handleInspect() {
    console.log('[Ispeziona] Lavoro', job);
    notify('Dati lavoro loggati in console (apri gli strumenti sviluppatore).');
  }

  return (
    <RowContextMenu
      className="group contents"
      menu={
        <>
          {canCreateProjects && (
            <button type="button" onClick={() => setModal('project')} className={MENU_ROW_CLASS}>
              <FolderPlus size={15} strokeWidth={1.75} aria-hidden="true" />
              Crea progetto
            </button>
          )}
          <button type="button" disabled className={`${MENU_ROW_CLASS} cursor-not-allowed opacity-50`}>
            <ListTodo size={15} strokeWidth={1.75} aria-hidden="true" />
            Crea task
            <span className="ml-auto text-[10px] text-secondary">Presto</span>
          </button>
          {canDelete && (
            <button type="button" onClick={() => setModal('delete')} className={`${MENU_ROW_CLASS} text-red-600 hover:bg-red-600/5`}>
              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Elimina lavoro
            </button>
          )}
          {isSuperadmin && (
            <>
              <div className="my-1 border-t border-grid-border" />
              <button type="button" onClick={handleInspect} className={MENU_ROW_CLASS}>
                <Bug size={15} strokeWidth={1.75} aria-hidden="true" />
                Ispeziona
              </button>
            </>
          )}
        </>
      }
    >
      <div className="flex items-center justify-center border-b border-grid-border px-1 py-2 group-hover:bg-row-hover">
        <JobRowSelectCheckbox jobId={job.id} />
      </div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{job.title}</div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {job.clientName ?? job.clientNameRaw ?? '—'}
      </div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        {job.clientId ? (
          <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>
        ) : (
          <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>
        )}
      </div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>{STATUS_LABEL[job.status]}</span>
      </div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{job.assignedToName ?? '—'}</div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatAmount(job.estimatedBudget)}</div>
      <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.endDate)}</div>

      <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 border-b border-l border-grid-border bg-card-bg px-2 group-hover:bg-row-hover">
        {canCreateProjects && <CreateProjectFromJobButton jobId={job.id} jobTitle={job.title} userOptions={userOptions} />}
        {canUpdate && !job.clientId && job.clientNameRaw && (
          <JobLinkButton jobId={job.id} jobClientName={job.clientNameRaw} clientOptions={clientOptions} />
        )}
        {canApprove && job.status === 'pending_approval' && <ApproveJobButton jobId={job.id} />}
        {canUpdate && job.status === 'completed' && !job.archivedAt && <ArchiveJobButton jobId={job.id} />}
        {canUpdate && (
          <Link href={`/dashboard/jobs/${job.id}/edit`} aria-label="Modifica lavoro" title="Modifica lavoro" className="text-secondary transition hover:text-primary">
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {modal === 'project' && (
        <CreateProjectFromJobModal jobId={job.id} jobTitle={job.title} userOptions={userOptions} onClose={() => setModal(null)} />
      )}
      {modal === 'delete' && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare il lavoro "${job.title}"?`}
          secondMessage="Confermi in modo definitivo? Il lavoro (e i sotto task collegati) verrà spostato nel cestino: potrai ripristinarlo in seguito."
          onConfirm={handleDeleteConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </RowContextMenu>
  );
}
