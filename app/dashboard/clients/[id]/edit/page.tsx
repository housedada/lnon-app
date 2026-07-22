import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import ClientForm from '@/components/ClientForm';
import { getClientById, getFicConnection } from '@/lib/db';
import { updateClientAction } from '@/lib/actions/clients';

export const metadata = { title: 'Modifica Cliente' };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  const ficConnection = await getFicConnection();

  if (!client) {
    notFound();
  }

  const boundAction = updateClientAction.bind(null, id);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Modifica Cliente</h1>

      {ficConnection && client.ficSyncStatus === 'orphaned' && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
            Cliente cancellato su Fatture in Cloud: non più sincronizzato.
          </span>
          <Link href={`/dashboard/clients/${client.id}/sync-fic`} className="whitespace-nowrap font-medium underline">
            Risincronizza
          </Link>
        </div>
      )}

      <ClientForm client={client} action={boundAction} />
    </div>
  );
}
