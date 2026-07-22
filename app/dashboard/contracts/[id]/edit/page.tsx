import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import ContractForm from '@/components/ContractForm';
import DangerActionModal from '@/components/DangerActionModal';
import { getContractById, getAllClientNames } from '@/lib/db';
import { updateContractAction, deleteContractAction } from '@/lib/actions/contracts';
import { canDeleteResource } from '@/lib/permissions';

export const metadata = { title: 'Modifica Contratto' };

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contract, clientOptions] = await Promise.all([getContractById(id), getAllClientNames()]);
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  if (!contract) {
    notFound();
  }

  const boundAction = updateContractAction.bind(null, id);
  const canDelete = canDeleteResource(role, '', '', 'contracts');

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Modifica Contratto</h1>
      <ContractForm
        contract={contract}
        clientOptions={clientOptions}
        action={boundAction}
        secondaryAction={
          canDelete && (
            <DangerActionModal
              action={deleteContractAction.bind(null, contract.id)}
              resourceLabel={`il contratto di “${contract.clientName ?? contract.clientNameRaw}”`}
              successMessage="Contratto eliminato."
            />
          )
        }
      />
    </div>
  );
}
