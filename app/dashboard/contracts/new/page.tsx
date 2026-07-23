import { FileText } from 'lucide-react';
import ContractForm from '@/components/ContractForm';
import FormPageModal from '@/components/FormPageModal';
import { createContractAction } from '@/lib/actions/contracts';
import { getAllClientNames } from '@/lib/db';

export const metadata = { title: 'Nuovo Contratto' };

export default async function NewContractPage() {
  const clientOptions = await getAllClientNames();

  return (
    <FormPageModal
      title="Nuovo Contratto"
      icon={<FileText size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
      closeHref="/dashboard/contracts"
    >
      <ContractForm clientOptions={clientOptions} action={createContractAction} />
    </FormPageModal>
  );
}
