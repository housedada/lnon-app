'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, FolderPlus, ListTodo, Trash2, Bug, Eye } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import JobRowSelectCheckbox from '@/components/JobRowSelectCheckbox';
import CreateProjectFromJobButton from '@/components/CreateProjectFromJobButton';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';
import CreateTaskButton from '@/components/CreateTaskButton';
import JobLinkButton from '@/components/JobLinkButton';
import ApproveJobButton from '@/components/ApproveJobButton';
import ArchiveJobButton from '@/components/ArchiveJobButton';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import DetailModal, { type DetailSection } from '@/components/DetailModal';
import MaskedAmount from '@/components/MaskedAmount';
import RowActionsCell from '@/components/RowActionsCell';
import InlineSelectCell, { type InlineSelectOption } from '@/components/InlineSelectCell';
import { deleteJobFromListAction, updateJobStatusAction } from '@/lib/actions/jobs';
import { notify } from '@/lib/notify';
import type { Job, JobStatus } from '@/lib/types';

const STATUS_LABEL: Record<JobStatus, string> = {
  preventivato: 'Preventivato',
  pre_approvato: 'Pre-approvato',
  in_corso: 'In corso',
  completato: 'Completato',
  fatturato: 'Fatturato',
  annullato: 'Annullato',
};

const STATUS_BADGE: Record<JobStatus, string> = {
  preventivato: 'bg-grid-header-bg text-secondary',
  pre_approvato: 'bg-amber-500/10 text-amber-700',
  in_corso: 'bg-blue-600/10 text-blue-700',
  completato: 'bg-yellow-300/20 text-yellow-700',
  fatturato: 'bg-green-600/10 text-green-700',
  annullato: 'bg-red-600/10 text-red-700',
};

const JOB_STATUS_OPTIONS: InlineSelectOption<JobStatus>[] = (Object.keys(STATUS_LABEL) as JobStatus[]).map((value) => ({
  value,
  label: STATUS_LABEL[value],
  badgeClassName: STATUS_BADGE[value],
}));

function formatAmount(value?: number) {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

function buildDetailSections(job: Job, showAmounts: boolean): DetailSection[] {
  return [
    {
      title: 'Anagrafica',
      fields: [
        { label: 'Titolo', value: job.title },
        { label: 'Cliente', value: job.clientName ?? job.clientNameRaw },
        { label: 'Contratti collegati', value: job.contractLabels?.join(', ') },
        { label: 'Stato', value: STATUS_LABEL[job.status] },
        { label: 'Assegnato a', value: job.assignedToName },
        { label: 'Descrizione', value: job.description },
      ],
    },
    {
      title: 'Date',
      fields: [
        { label: 'Anno di competenza', value: job.fiscalYear },
        { label: 'Data inizio', value: formatDate(job.startDate) },
        { label: 'Scadenza', value: formatDate(job.endDate) },
        { label: 'Approvato il', value: formatDate(job.approvedAt) },
      ],
    },
    {
      title: 'Economico',
      fields: showAmounts
        ? [
            { label: 'Budget stimato', value: formatAmount(job.estimatedBudget) },
            { label: 'Budget effettivo', value: formatAmount(job.actualBudget) },
            { label: 'Spese fornitori', value: formatAmount(job.supplierCost) },
            { label: 'Valuta', value: job.currency },
          ]
        : [{ label: 'Importi', value: 'Nascosti per il tuo ruolo' }],
    },
    {
      title: 'Fattura',
      fields: [{ label: 'Numero fattura', value: job.invoiceNumber }],
    },
  ];
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

type ModalKind = 'project' | 'delete' | 'detail' | null;

export default function JobRow({
  job,
  canCreateProjects,
  canUpdate,
  canApprove,
  canDelete,
  isSuperadmin,
  clientOptions,
  userOptions,
  showAmounts,
  className,
}: {
  job: Job;
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  showAmounts: boolean;
  className?: string;
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
      className={`group contents ${className ?? ''}`.trim()}
      menu={
        <>
          <button type="button" onClick={() => setModal('detail')} className={MENU_ROW_CLASS}>
            <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
            Vedi dettaglio
          </button>
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
      <div className="list-cell-deco flex items-center justify-center border-b border-grid-border px-1 py-2 group-hover:bg-row-hover">
        <JobRowSelectCheckbox jobId={job.id} />
      </div>
      <div
        onClick={() => setModal('detail')}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover"
      >
        {job.title}
        {job.isSystemGenerated && (
          <span className="ml-1.5 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-700">
            Conteggio orario
          </span>
        )}
      </div>
      <div
        onClick={() => setModal('detail')}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {job.clientName ?? job.clientNameRaw ?? '—'}
      </div>
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        {job.clientId ? (
          <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>
        ) : (
          <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>
        )}
      </div>
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        {canUpdate ? (
          <InlineSelectCell value={job.status} options={JOB_STATUS_OPTIONS} onSave={updateJobStatusAction.bind(null, job.id)} />
        ) : (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>{STATUS_LABEL[job.status]}</span>
        )}
      </div>
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{job.assignedToName ?? '—'}</div>
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{showAmounts ? formatAmount(job.estimatedBudget) : <MaskedAmount />}</div>
      <div onClick={() => setModal('detail')} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.endDate)}</div>

      <RowActionsCell>
        <button
          type="button"
          onClick={() => setModal('detail')}
          aria-label="Vedi dettaglio lavoro"
          title="Vedi dettaglio lavoro"
          className="text-secondary transition hover:text-primary"
        >
          <Eye size={15} strokeWidth={1.75} />
        </button>
        {canCreateProjects && <CreateProjectFromJobButton jobId={job.id} jobTitle={job.title} userOptions={userOptions} />}
        <CreateTaskButton />
        {canUpdate && !job.clientId && job.clientNameRaw && (
          <JobLinkButton jobId={job.id} jobClientName={job.clientNameRaw} clientOptions={clientOptions} />
        )}
        {canApprove && job.status === 'preventivato' && <ApproveJobButton jobId={job.id} />}
        {canUpdate &&
          (job.status === 'completato' || job.status === 'fatturato' || job.status === 'annullato') &&
          !job.archivedAt && <ArchiveJobButton jobId={job.id} />}
        {canUpdate && (
          <Link href={`/dashboard/jobs/${job.id}/edit`} aria-label="Modifica lavoro" title="Modifica lavoro" className="text-secondary transition hover:text-primary">
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </RowActionsCell>

      {modal === 'detail' && (
        <DetailModal title={job.title} sections={buildDetailSections(job, showAmounts)} onClose={() => setModal(null)} />
      )}
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
