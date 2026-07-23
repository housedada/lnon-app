import Link from 'next/link';
import { Suspense } from 'react';
import { Pencil, Archive } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';
import ApproveJobButton from '@/components/ApproveJobButton';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobLinkButton from '@/components/JobLinkButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import CreateProjectFromJobButton from '@/components/CreateProjectFromJobButton';
import ArchiveJobButton from '@/components/ArchiveJobButton';
import NewJobButton from '@/components/NewJobButton';
import JobRowSelectCheckbox from '@/components/JobRowSelectCheckbox';
import JobsSelectAllCheckbox from '@/components/JobsSelectAllCheckbox';
import JobsBulkArchiveButton from '@/components/JobsBulkArchiveButton';
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

type SearchParams = { q?: string; page?: string; clientId?: string; sync?: string; status?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  const [clientOptions, contractOptions, productOptions, allUsers] = await Promise.all([
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const canCreateProjects = hasPermission(role, 'projects', 'create');
  const canCreate = hasPermission(role, 'jobs', 'create');
  const canUpdate = hasPermission(role, 'jobs', 'update');
  const canApprove = hasPermission(role, 'jobs', 'approve');

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Lavori</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <NewJobButton
              clientOptions={clientOptions}
              contractOptions={contractOptions}
              productOptions={productOptions}
              userOptions={userOptions}
            />
          )}
          {canUpdate && <SyncJobsClientsButton />}
          <Link
            href="/dashboard/jobs/archive"
            aria-label="Archivio lavori"
            title="Archivio lavori"
            className="flex items-center gap-1.5 rounded-lg border border-grid-border px-3 py-2 text-sm font-medium text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
            Archivio
          </Link>
        </div>
      </div>

      <JobsFilterBar clientOptions={clientOptions} />

      <Suspense fallback={<ListPlaceholder />}>
        <JobsListSection
          params={params}
          role={role}
          userId={(session?.user as { id?: string } | undefined)?.id}
          clientOptions={clientOptions}
          userOptions={userOptions}
          canCreateProjects={canCreateProjects}
          canUpdate={canUpdate}
          canApprove={canApprove}
        />
      </Suspense>
    </div>
  );
}

async function JobsListSection({
  params,
  role,
  userId,
  clientOptions,
  userOptions,
  canCreateProjects,
  canUpdate,
  canApprove,
}: {
  params: SearchParams;
  role: 'superadmin' | 'admin' | 'dipendente';
  userId?: string;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
}) {
  const { q, page, clientId, sync, status } = params;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data: jobs, total } = await getJobs({
    search: q,
    clientId,
    sync,
    status,
    assignedTo: role === 'dipendente' ? userId : undefined,
    limit: PAGE_SIZE,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ListNavigator
      basePath="/dashboard/jobs"
      searchPlaceholder="Cerca per titolo..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="lavori"
      extraTopControls={<JobsBulkArchiveButton />}
    >
      <div className="mx-6 mt-6 grid grid-cols-[32px_2fr_1.5fr_auto_1fr_1fr_1fr_1fr_40px_40px_40px_40px_40px] gap-x-[2px] border-t border-grid-border text-[12px]">
        <div className="flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
          <JobsSelectAllCheckbox jobIds={jobs.map((j) => j.id)} />
        </div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Sync</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
        <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Scadenza</div>
        <div className="sticky right-40 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />
        <div className="sticky right-30 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />
        <div className="sticky right-20 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />
        <div className="sticky right-10 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />
        <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

        {jobs.length === 0 && (
          <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
            Nessun lavoro trovato{q ? ` per “${q}”` : ''}.
          </div>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="group contents">
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
            <div className="sticky right-40 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
              {canCreateProjects && (
                <CreateProjectFromJobButton jobId={job.id} jobTitle={job.title} userOptions={userOptions} />
              )}
            </div>
            <div className="sticky right-30 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
              {canUpdate && !job.clientId && job.clientNameRaw && (
                <JobLinkButton jobId={job.id} jobClientName={job.clientNameRaw} clientOptions={clientOptions} />
              )}
            </div>
            <div className="sticky right-20 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
              {canApprove && job.status === 'pending_approval' && <ApproveJobButton jobId={job.id} />}
            </div>
            <div className="sticky right-10 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
              {canUpdate && job.status === 'completed' && !job.archivedAt && <ArchiveJobButton jobId={job.id} />}
            </div>
            <div className="sticky right-0 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
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
  );
}
