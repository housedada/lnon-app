import ClientForm from '@/components/ClientForm';
import { createClientAction } from '@/lib/actions/clients';

export default function NewClientPage() {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Nuovo Cliente</h1>
      <ClientForm action={createClientAction} />
    </div>
  );
}
