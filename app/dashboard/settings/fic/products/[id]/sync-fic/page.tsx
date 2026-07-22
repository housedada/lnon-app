import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getProductById, getFicConnection } from '@/lib/db';
import { createFicProductFromLnonAction, linkProductToFicAction } from '@/lib/actions/fic';
import FicProductSearch from '@/components/FicProductSearch';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Sincronizza con Fatture in Cloud' };

export default async function SyncFicProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  const connection = await getFicConnection();
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;

  if (!product || !connection || role !== 'superadmin') {
    notFound();
  }

  const boundLink = linkProductToFicAction.bind(null, product.id);
  const boundCreate = createFicProductFromLnonAction.bind(null, product.id);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Sincronizza {product.name}</h1>

      {product.ficSyncStatus === 'orphaned' && (
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Questo prodotto era collegato a Fatture in Cloud, ma il prodotto corrispondente è stato cancellato su FiC.
            Ricollegalo a un prodotto FiC esistente oppure creane uno nuovo.
          </p>
        </div>
      )}

      <div className="mx-6 mt-6 grid max-w-2xl gap-6">
        <section className="rounded-lg border border-grid-border p-5">
          <h2 className="text-sm font-semibold text-primary">Collega a un prodotto FiC esistente</h2>
          <p className="mt-1 text-xs text-secondary">Cerca per nome o codice.</p>
          <FicProductSearch linkAction={boundLink} />
        </section>

        <section className="rounded-lg border border-grid-border p-5">
          <h2 className="text-sm font-semibold text-primary">Oppure crea un nuovo prodotto su FiC</h2>
          <p className="mt-1 text-xs text-secondary">
            Verrà creato un nuovo prodotto su Fatture in Cloud usando i dati già presenti su questo record LNON.
          </p>
          <form action={boundCreate} className="mt-3">
            <SubmitButton pendingLabel="Creazione in corso..." className="btn-accent rounded-lg px-4 py-2 text-sm font-medium">
              Crea nuovo prodotto su Fatture in Cloud
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
