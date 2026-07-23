import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import JobForm from '@/components/JobForm';
import DangerActionModal from '@/components/DangerActionModal';
import { getJobById, getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';
import { updateJobAction, deleteJobAction } from '@/lib/actions/jobs';
import { canDeleteResource } from '@/lib/permissions';

export const metadata = { title: 'Modifica Lavoro' };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, clientOptions, contractOptions, productOptions, users] = await Promise.all([
    getJobById(id),
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  if (!job) {
    notFound();
  }

  const userOptions = users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));
  const boundAction = updateJobAction.bind(null, id);
  const canDelete = canDeleteResource(role, '', '', 'jobs');

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Modifica Lavoro</h1>
      <JobForm
        job={job}
        clientOptions={clientOptions}
        contractOptions={contractOptions}
        productOptions={productOptions}
        userOptions={userOptions}
        action={boundAction}
        secondaryAction={
          canDelete && (
            <DangerActionModal
              action={deleteJobAction.bind(null, job.id)}
              resourceLabel={`il lavoro “${job.title}”`}
              successMessage="Lavoro eliminato."
            />
          )
        }
      />
    </div>
  );
}
