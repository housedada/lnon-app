import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getClientById, getFicConnection } from '@/lib/db';
import { createFicClientFromLnonAction, linkClientToFicAction } from '@/lib/actions/fic';
import FicClientSearch from '@/components/FicClientSearch';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Sincronizza con Fatture in Cloud' };

export default async function SyncFicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  const connection = await getFicConnection();
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!client || !connection || role !== 'superadmin') {
    notFound();
  }

  const boundLink = linkClientToFicAction.bind(null, client.id);
  const boundCreate = createFicClientFromLnonAction.bind(null, client.id);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Sincronizza {client.name}</h1>

      {client.ficSyncStatus === 'orphaned' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Questo cliente era collegato a Fatture in Cloud, ma il cliente corrispondente è stato cancellato su FiC.
            I lavori collegati a questo cliente in LNON non sono stati toccati. Ricollegalo a un cliente FiC
            esistente oppure creane uno nuovo.
          </p>
        </div>
      )}

      <div className="mx-6 mt-6 grid max-w-2xl gap-6">
        <section className="rounded-lg border border-grid-border p-5">
          <h2 className="text-sm font-semibold text-primary">Collega a un cliente FiC esistente</h2>
          <p className="mt-1 text-xs text-secondary">Cerca per nome, P.IVA o codice fiscale.</p>
          <FicClientSearch linkAction={boundLink} />
        </section>

        <section className="rounded-lg border border-grid-border p-5">
          <h2 className="text-sm font-semibold text-primary">Oppure crea un nuovo cliente su FiC</h2>
          <p className="mt-1 text-xs text-secondary">
            Verrà creato un nuovo cliente su Fatture in Cloud usando i dati già presenti su questo record LNON
            (nome, indirizzo, P.IVA, IBAN, ecc.).
          </p>
          <form action={boundCreate} className="mt-3">
            <SubmitButton pendingLabel="Creazione in corso..." className="btn-accent rounded-lg px-4 py-2 text-sm font-medium">
              Crea nuovo cliente su Fatture in Cloud
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
