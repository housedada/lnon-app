import ListNavigator from '@/components/ListNavigator';
import JobsSelectAllCheckbox from '@/components/JobsSelectAllCheckbox';
import JobsBulkArchiveButton from '@/components/JobsBulkArchiveButton';
import JobRow from '@/components/JobRow';
import LazyRevealRows from '@/components/LazyRevealRows';
import { getJobs } from '@/lib/db';
import { parsePageSize } from '@/lib/listPageSize';
import type { JobCategory } from '@/lib/types';

export interface JobsListSectionParams {
  q?: string;
  page?: string;
  pageSize?: string;
  clientId?: string;
  sync?: string;
  status?: string;
}

export default async function JobsListSection({
  category,
  basePath,
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
  showAmounts,
}: {
  category: JobCategory;
  basePath: string;
  params: JobsListSectionParams;
  role: 'superadmin' | 'admin' | 'dipendente';
  userId?: string;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  canCreateProjects: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  showAmounts: boolean;
}) {
  const { q, page, clientId, sync, status } = params;
  const pageSize = parsePageSize(params.pageSize);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;

  const { data: jobs, total } = await getJobs({
    search: q,
    clientId,
    sync,
    status,
    category,
    assignedTo: role === 'dipendente' ? userId : undefined,
    limit: pageSize,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ListNavigator
      basePath={basePath}
      searchPlaceholder="Cerca per titolo..."
      q={q}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      showSyncFilter={false}
      totalCount={total}
      totalLabel="lavori"
      extraTopControls={<JobsBulkArchiveButton />}
    >
      <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
        <div
          className="grid w-full text-[12px]"
          style={{ gridTemplateColumns: '32px repeat(7, minmax(max-content, 1fr)) max-content' }}
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
              Nessun lavoro trovato{q ? ` per "${q}"` : ''}.
            </div>
          )}

          <LazyRevealRows total={jobs.length} enabled={pageSize > 25}>
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
                showAmounts={showAmounts}
              />
            ))}
          </LazyRevealRows>
        </div>
      </div>
    </ListNavigator>
  );
}
