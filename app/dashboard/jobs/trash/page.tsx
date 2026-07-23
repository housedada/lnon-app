import { Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs } from '@/lib/db';
import { canDeleteResource } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import RestoreJobButton from '@/components/RestoreJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import type { JobStatus } from '@/lib/types';

export const metadata = { title: 'Cestino Lavori' };

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

export default async function JobsTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canRestore = canDeleteResource(role, '', '', 'jobs');

  const { data: jobs, total } = await getJobs({ search: q, trashed: true, limit: PAGE_SIZE, offset });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro aggiornato." />
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
        showSyncFilter={false}
        totalCount={total}
        totalLabel="lavori nel cestino"
      >
        <div className="mx-6 mt-6 grid grid-cols-[2fr_1.5fr_1fr_1fr_40px] gap-x-[2px] border-t border-grid-border text-[12px]">
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Eliminato il</div>
          <div className="border-b border-grid-border bg-grid-header-bg" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro nel cestino{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="group contents">
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{job.title}</div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
                {job.clientName ?? job.clientNameRaw ?? '—'}
              </div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">{STATUS_LABEL[job.status]}</span>
              </div>
              <div className="list-row-cell flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(job.deletedAt)}</div>
              <div className="flex aspect-square items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
                {canRestore && <RestoreJobButton jobId={job.id} />}
              </div>
            </div>
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
