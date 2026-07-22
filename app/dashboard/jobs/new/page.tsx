import JobForm from '@/components/JobForm';
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
  const userOptions = users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name }));

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Nuovo Lavoro</h1>
      <JobForm
        clientOptions={clientOptions}
        contractOptions={contractOptions}
        productOptions={productOptions}
        userOptions={userOptions}
        action={createJobAction}
      />
    </div>
  );
}
