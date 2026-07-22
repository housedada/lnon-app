import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs, getAllClientNames, getUsers } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ApproveJobButton from '@/components/ApproveJobButton';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobLinkButton from '@/components/JobLinkButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import CreateProjectFromJobButton from '@/components/CreateProjectFromJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import type { JobStatus } from '@/lib/types';

export const metadata = { title: 'Lavori' };

const PAGE_SIZE = 21;

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
  approved: 'bg-sky-500/10 text-sky-700',
  in_progress: 'bg-blue-600/10 text-blue-700',
  completed: 'bg-green-600/10 text-green-700',
  cancelled: 'bg-red-600/10 text-red-700',
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; clientId?: string; sync?: string; status?: string }>;
}) {
  const { q, page, clientId, sync, status } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [{ data: jobs, total }, clientOptions, allUsers] = await Promise.all([
    getJobs({
      search: q,
      clientId,
      sync,
      status,
      assignedTo: role === 'dipendente' ? userId : undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getAllClientNames(),
    getUsers(),
  ]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const canCreateProjects = hasPermission(role, 'projects', 'create');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'jobs', 'create');
  const canUpdate = hasPermission(role, 'jobs', 'update');
  const canApprove = hasPermission(role, 'jobs', 'approve');

  function formatAmount(value?: number) {
    return value != null ? `€ ${value.toFixed(2)}` : '—';
  }

  function formatDate(value?: Date) {
    return value ? value.toLocaleDateString('it-IT') : '—';
  }

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Lavori</h1>
          <p className="mt-1 text-sm text-secondary">{total} lavori totali</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Link
              href="/dashboard/jobs/new"
              className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nuovo Lavoro
            </Link>
          )}
          {canUpdate && <SyncJobsClientsButton />}
        </div>
      </div>

      <JobsFilterBar clientOptions={clientOptions} />

      <ListNavigator
        basePath="/dashboard/jobs"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        showSyncFilter={false}
      >
        <div className="mx-6 mt-6 grid grid-cols-[2fr_1.5fr_auto_1fr_1fr_1fr_1fr_40px_40px_40px_40px] gap-x-[2px] border-t border-grid-border text-[12px]">
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Sync</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Scadenza</div>
          <div className="border-b border-grid-border bg-grid-header-bg" />
          <div className="border-b border-grid-border bg-grid-header-bg" />
          <div className="border-b border-grid-border bg-grid-header-bg" />
          <div className="border-b border-grid-border bg-grid-header-bg" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="group contents">
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
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canCreateProjects && (
                  <CreateProjectFromJobButton jobId={job.id} jobTitle={job.title} userOptions={userOptions} />
                )}
              </div>
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canUpdate && !job.clientId && job.clientNameRaw && (
                  <JobLinkButton jobId={job.id} jobClientName={job.clientNameRaw} clientOptions={clientOptions} />
                )}
              </div>
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canApprove && job.status === 'pending_approval' && <ApproveJobButton jobId={job.id} />}
              </div>
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canUpdate && (
                  <Link href={`/dashboard/jobs/${job.id}/edit`} aria-label="Modifica lavoro" className="text-secondary transition hover:text-primary">
                    <Pencil size={15} strokeWidth={1.75} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
