import { Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs } from '@/lib/db';
import { canDeleteResource } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import RestoreJobButton from '@/components/RestoreJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import LazyRevealRows from '@/components/LazyRevealRows';
import RowActionsCell from '@/components/RowActionsCell';
import { parsePageSize } from '@/lib/listPageSize';
import type { JobStatus } from '@/lib/types';

export const metadata = { title: 'Cestino Lavori' };

const GRID_TEMPLATE = 'repeat(4, minmax(max-content, 1fr)) max-content';

const STATUS_LABEL: Record<JobStatus, string> = {
  preventivato: 'Preventivato',
  pre_approvato: 'Pre-approvato',
  in_corso: 'In corso',
  completato: 'Completato',
  fatturato: 'Fatturato',
  annullato: 'Annullato',
};

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default async function JobsTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam } = await searchParams;
  const pageSize = parsePageSize(pageSizeParam);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canRestore = canDeleteResource(role, '', '', 'jobs');

  const { data: jobs, total } = await getJobs({ search: q, trashed: true, limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro aggiornato." />
      <RememberRoute storageKey="jobs-tab" tabKey="trash" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <Trash2 size={22} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            Cestino Lavori
          </h1>
        </div>
      </div>

      <ListNavigator
        basePath="/dashboard/jobs/trash"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori nel cestino"
      >
        <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
          <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Eliminato il</div>
            <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

            {jobs.length === 0 && (
              <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
                Nessun lavoro nel cestino{q ? ` per “${q}”` : ''}.
              </div>
            )}

            <LazyRevealRows total={jobs.length} enabled={pageSize > 25}>
              {jobs.map((job) => (
                <div key={job.id} className="group contents">
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{job.title}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
                    {job.clientName ?? job.clientNameRaw ?? '—'}
                  </div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                    <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">{STATUS_LABEL[job.status]}</span>
                  </div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.deletedAt)}</div>
                  <RowActionsCell>{canRestore && <RestoreJobButton jobId={job.id} />}</RowActionsCell>
                </div>
              ))}
            </LazyRevealRows>
          </div>
        </div>
      </ListNavigator>
    </div>
  );
}
