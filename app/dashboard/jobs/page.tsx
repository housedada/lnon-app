import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getJobs } from '@/lib/db';
import { hasPermission, canDeleteResource } from '@/lib/permissions';
import ListNavigator from '@/components/ListNavigator';
import ApproveJobButton from '@/components/ApproveJobButton';
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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const { data: jobs, total } = await getJobs({
    search: q,
    assignedTo: role === 'dipendente' ? userId : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canCreate = hasPermission(role, 'jobs', 'create');
  const canUpdate = hasPermission(role, 'jobs', 'update');
  const canApprove = hasPermission(role, 'jobs', 'approve');
  const canDelete = canDeleteResource(role, '', '', 'jobs');

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
        {canCreate && (
          <Link
            href="/dashboard/jobs/new"
            className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nuovo Lavoro
          </Link>
        )}
      </div>

      <ListNavigator
        basePath="/dashboard/jobs"
        searchPlaceholder="Cerca per titolo..."
        q={q}
        currentPage={currentPage}
        totalPages={totalPages}
        showSyncFilter={false}
      >
        <div className="mx-6 mt-6 grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-x-[2px] border-t border-grid-border text-[12px]">
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Titolo</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Cliente</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Stato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Assegnato a</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Budget stimato</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary">Scadenza</div>
          <div className="flex items-center border-b border-grid-border bg-grid-header-bg px-3 py-2 font-semibold uppercase tracking-wide text-secondary" />

          {jobs.length === 0 && (
            <div className="col-span-full border-b border-grid-border px-3 py-12 text-center text-sm text-secondary">
              Nessun lavoro trovato{q ? ` per “${q}”` : ''}.
            </div>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="group contents">
              <div className="flex items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{job.title}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">{job.clientName ?? '—'}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>{STATUS_LABEL[job.status]}</span>
              </div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">{job.assignedToName ?? '—'}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">{formatAmount(job.estimatedBudget)}</div>
              <div className="flex items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:font-semibold group-hover:text-primary">{formatDate(job.endDate)}</div>
              <div className="flex items-center justify-end gap-3 border-b border-grid-border px-3 py-2 whitespace-nowrap group-hover:bg-row-hover">
                {canApprove && job.status === 'pending_approval' && <ApproveJobButton jobId={job.id} />}
                {canUpdate && (
                  <Link href={`/dashboard/jobs/${job.id}/edit`} aria-label="Modifica lavoro" className="text-secondary transition hover:text-primary">
                    <Pencil size={15} strokeWidth={1.75} />
                  </Link>
                )}
                {!canUpdate && !canDelete && <span className="text-muted">—</span>}
              </div>
            </div>
          ))}
        </div>
      </ListNavigator>
    </div>
  );
}
