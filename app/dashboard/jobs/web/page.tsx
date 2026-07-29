import Link from 'next/link';
import { Suspense } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { hasPermission, canDeleteResource, canViewAmounts } from '@/lib/permissions';
import ListPlaceholder from '@/components/ListPlaceholder';
import SyncJobsClientsButton from '@/components/SyncJobsClientsButton';
import JobsFilterBar from '@/components/JobsFilterBar';
import NewJobButton from '@/components/NewJobButton';
import NotifyFromQuery from '@/components/NotifyFromQuery';
import RememberRoute from '@/components/RememberRoute';
import JobsListSection, { type JobsListSectionParams } from '@/components/JobsListSection';

export const metadata = { title: 'Lavori · Contratti Web' };

export default async function JobsWebPage({ searchParams }: { searchParams: Promise<JobsListSectionParams> }) {
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
  const showAmounts = canViewAmounts(role);

  return (
    <div>
      <NotifyFromQuery param="saved" message="Lavoro salvato." />
      <RememberRoute storageKey="jobs-tab" tabKey="web" />
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
          category="web"
          basePath="/dashboard/jobs/web"
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
          showAmounts={showAmounts}
        />
      </Suspense>
    </div>
  );
}
