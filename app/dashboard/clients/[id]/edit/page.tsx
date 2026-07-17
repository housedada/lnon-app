import { notFound } from 'next/navigation';
import ClientForm from '@/components/ClientForm';
import { getClientById } from '@/lib/db';
import { updateClientAction } from '@/lib/actions/clients';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  const boundAction = updateClientAction.bind(null, id);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-neutral-900">Modifica Cliente</h1>
      <ClientForm client={client} action={boundAction} />
    </div>
  );
}
