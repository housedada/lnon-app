import ContractForm from '@/components/ContractForm';
import { createContractAction } from '@/lib/actions/contracts';
import { getAllClientNames } from '@/lib/db';

export const metadata = { title: 'Nuovo Contratto' };

export default async function NewContractPage() {
  const clientOptions = await getAllClientNames();

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Nuovo Contratto</h1>
      <ContractForm clientOptions={clientOptions} action={createContractAction} />
    </div>
  );
}
