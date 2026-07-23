import Link from 'next/link';
import { Suspense } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ListPlaceholder from '@/components/ListPlaceholder';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import NewJobButton from '@/components/NewJobButton';
import JobsSelectAllCheckbox from '@/components/JobsSelectAllCheckbox';
import JobsBulkArchiveButton from '@/components/JobsBulkArchiveButton';
import JobRow from '@/components/JobRow';
import NotifyFromQuery from '@/components/NotifyFromQuery';

export const metadata = { title: 'Lavori' };

const PAGE_SIZE = 21;

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
  const canDelete = canDeleteResource(role, '', '', 'jobs');
  const isSuperadmin = role === 'superadmin';

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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Archive size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard/jobs/trash"
            aria-label="Cestino lavori"
            title="Cestino lavori"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-grid-border text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
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
          canDelete={canDelete}
          isSuperadmin={isSuperadmin}
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
  canDelete,
  isSuperadmin,
}: {
  params: SearchParams;
  role: 'superadmin' | 'admin' | 'dipendente';
  userId?: string;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
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
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div
          className="grid w-fit min-w-full text-[12px]"
          style={{ gridTemplateColumns: '32px repeat(7, max-content) max-content' }}
        >
          <div className="list-cell-deco flex items-center justify-center border-b border-grid-border bg-grid-header-bg px-1 py-2">
            <JobsSelectAllCheckbox jobIds={jobs.map((j) => j.id)} />
          </div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Sync</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
          <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Scadenza</div>
          <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              canCreateProjects={canCreateProjects}
              canUpdate={canUpdate}
              canApprove={canApprove}
              canDelete={canDelete}
              isSuperadmin={isSuperadmin}
              clientOptions={clientOptions}
              userOptions={userOptions}
            />
          ))}
        </div>
      </div>
    </ListNavigator>
  );
}
