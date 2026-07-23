import { Building2 } from 'lucide-react';
import ClientForm from '@/components/ClientForm';
import FormPageModal from '@/components/FormPageModal';
import { createClientAction } from '@/lib/actions/clients';

export const metadata = { title: 'Nuovo Cliente' };

export default function NewClientPage() {
  return (
    <FormPageModal
      title="Nuovo Cliente"
      icon={<Building2 size={16} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />}
      closeHref="/dashboard/clients"
    >
      <ClientForm action={createClientAction} />
    </FormPageModal>
  );
}
