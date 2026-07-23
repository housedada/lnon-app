import { Archive } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs, getArchivedJobYears } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import UnarchiveJobButton from '@/components/UnarchiveJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import type { JobStatus } from '@/lib/types';

export const metadata = { title: 'Archivio Lavori' };

const PAGE_SIZE = 25;

const STATUS_LABEL: Record<JobStatus, string> = {
  draft: 'Bozza',
  pending_approval: 'In attesa',
  approved: 'Approvato',
  in_progress: 'In corso',
  completed: 'Completato',
  cancelled: 'Annullato',
};

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default async function JobsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; year?: string }>;
}) {
  const { q, page, year } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const archivedYear = year ? Number(year) : undefined;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canUpdate = hasPermission(role, 'jobs', 'update');

  const [{ data: jobs, total }, years] = await Promise.all([
    getJobs({ search: q, archived: true, archivedYear, limit: PAGE_SIZE, offset }),
    getArchivedJobYears(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro aggiornato." />
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
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori archiviati"
      >
        <div className="mx-6 mt-6 grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-x-[2px] border-t border-grid-border text-[12px]">
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Archiviato il</div>
          <div className="border-b border-grid-border bg-grid-header-bg" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro archiviato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="group contents">
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{job.title}</div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
                {job.clientName ?? job.clientNameRaw ?? '—'}
              </div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-medium text-green-700">{STATUS_LABEL[job.status]}</span>
              </div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{job.assignedToName ?? '—'}</div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.archivedAt)}</div>
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canUpdate && <UnarchiveJobButton jobId={job.id} />}
              </div>
            </div>
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
