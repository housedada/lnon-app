import { Archive } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs, getArchivedJobYears } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import UnarchiveJobButton from '@/components/UnarchiveJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import LazyRevealRows from '@/components/LazyRevealRows';
import RowActionsCell from '@/components/RowActionsCell';
import { parsePageSize } from '@/lib/listPageSize';
import type { JobStatus } from '@/lib/types';

export const metadata = { title: 'Archivio Lavori' };

const GRID_TEMPLATE = 'repeat(5, minmax(max-content, 1fr)) max-content';

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

export default async function JobsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; year?: string }>;
}) {
  const { q, page, pageSize: pageSizeParam, year } = await searchParams;
  const pageSize = parsePageSize(pageSizeParam);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * pageSize;
  const archivedYear = year ? Number(year) : undefined;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canUpdate = hasPermission(role, 'jobs', 'update');

  const [{ data: jobs, total }, years] = await Promise.all([
    getJobs({ search: q, archived: true, archivedYear, limit: pageSize, offset }),
    getArchivedJobYears(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro aggiornato." />
      <RememberRoute storageKey="jobs-tab" tabKey="archive" />
      <div className="flex items-center justify-between p-6 pb-0">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <Archive size={22} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            Archivio Lavori
          </h1>
        </div>
      </div>

      <div className="mx-6 mt-6 flex flex-wrap items-center gap-2">
        <a
          href="/dashboard/jobs/archive"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            !archivedYear ? 'border-transparent bg-grid-header-bg text-primary' : 'border-grid-border text-secondary hover:bg-row-hover'
          }`}
        >
          Tutti gli anni
        </a>
        {years.map((y) => (
          <a
            key={y}
            href={`/dashboard/jobs/archive?year=${y}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              archivedYear === y ? 'border-transparent bg-grid-header-bg text-primary' : 'border-grid-border text-secondary hover:bg-row-hover'
            }`}
          >
            {y}
          </a>
        ))}
      </div>

      <ListNavigator
        basePath="/dashboard/jobs/archive"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori archiviati"
      >
        <div className="mx-6 mt-6 overflow-x-auto border-t border-grid-border">
          <div className="grid w-full text-[12px]" style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
            <div className="list-header-cell flex items-center whitespace-nowrap border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Archiviato il</div>
            <div className="sticky right-0 z-[6] border-b border-l border-grid-border bg-grid-header-bg" />

            {jobs.length === 0 && (
              <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
                Nessun lavoro archiviato{q ? ` per “${q}”` : ''}.
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
                    <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-medium text-green-700">{STATUS_LABEL[job.status]}</span>
                  </div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{job.assignedToName ?? '—'}</div>
                  <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.archivedAt)}</div>
                  <RowActionsCell>{canUpdate && <UnarchiveJobButton jobId={job.id} />}</RowActionsCell>
                </div>
              ))}
            </LazyRevealRows>
          </div>
        </div>
      </ListNavigator>
    </div>
  );
}
