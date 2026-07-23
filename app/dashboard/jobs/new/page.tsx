import { Briefcase } from 'lucide-react';
import JobForm from '@/components/JobForm';
import FormPageModal from '@/components/FormPageModal';
import { createJobAction } from '@/lib/actions/jobs';
import { getAllClientNames, getAllContractOptions, getAllProductNames, getUsers } from '@/lib/db';

export const metadata = { title: 'Nuovo Lavoro' };

export default async function NewJobPage() {
  const [clientOptions, contractOptions, productOptions, users] = await Promise.all([
    getAllClientNames(),
    getAllContractOptions(),
    getAllProductNames(),
    getUsers(),
  ]);
  const userOptions = users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));

  return (
    <FormPageModal
      title="Nuovo Lavoro"
      icon={<Briefcase size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
      closeHref="/dashboard/jobs"
    >
      <JobForm
        clientOptions={clientOptions}
        contractOptions={contractOptions}
        productOptions={productOptions}
        userOptions={userOptions}
        action={createJobAction}
      />
    </FormPageModal>
  );
}
