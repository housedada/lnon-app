import Link from 'next/link';
import { headers } from 'next/headers';
import { CheckCircle2, XCircle, Link2, Package } from 'lucide-react';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getFicConnection } from '@/lib/db';
import { getFicDeleteWebhookStatus, FIC_WEBHOOK_DELETE_TYPES } from '@/lib/fattureincloud';
import { registerFicWebhookAction } from '@/lib/actions/fic';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Fatture in Cloud' };

export default async function FicSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canManage = hasPermission(role, 'settings', 'manage_integrations');

  const connection = await getFicConnection();
  const webhookStatus = connection ? await getFicDeleteWebhookStatus() : null;
  const headersList = await headers();
  const host = headersList.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appBaseUrl = host ? `${protocol}://${host}` : '';

  const boundRegisterWebhook = registerFicWebhookAction.bind(null, appBaseUrl);
  const webhookComplete = Boolean(
    webhookStatus?.verified && FIC_WEBHOOK_DELETE_TYPES.every((t) => webhookStatus.types.includes(t))
  );

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Fatture in Cloud</h1>
      <p className="px-6 pt-1 text-sm text-secondary">
        Collega Housedada al tuo account Fatture in Cloud per sincronizzare clienti e prodotti.
      </p>

      <div className="mx-6 mt-6 max-w-xl rounded-lg border border-grid-border p-5">
        {error && (
          <div className="mb-4 rounded-md border border-red-600/30 bg-red-600/5 px-3 py-2 text-sm text-red-600">
            Collegamento non riuscito ({error}). Riprova.
          </div>
        )}
        {connected && (
          <div className="mb-4 rounded-md border border-green-600/30 bg-green-600/5 px-3 py-2 text-sm text-green-700">
            Connesso con successo a Fatture in Cloud.
          </div>
        )}

        <div className="flex items-center gap-3">
          {connection ? (
            <CheckCircle2 size={20} strokeWidth={1.75} className="text-green-600" aria-hidden="true" />
          ) : (
            <XCircle size={20} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
          )}
          <div>
            <p className="text-sm font-medium text-primary">
              {connection ? `Connesso a ${connection.ficCompanyName ?? `azienda #${connection.ficCompanyId}`}` : 'Non connesso'}
            </p>
            {connection && (
              <p className="text-xs text-secondary">
                Webhook cancellazioni (clienti + prodotti):{' '}
                {webhookComplete ? 'attivo' : webhookStatus ? 'incompleto / da verificare' : 'non registrato'}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/api/fic/oauth/authorize"
              className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Link2 size={16} strokeWidth={2} aria-hidden="true" />
              {connection ? 'Ricollega account' : 'Connetti a Fatture in Cloud'}
            </a>

            {connection && !webhookComplete && (
              <form action={boundRegisterWebhook}>
                <SubmitButton
                  pendingLabel="Verifica in corso..."
                  className="rounded-lg border border-grid-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-row-hover"
                >
                  {webhookStatus ? 'Riprova verifica webhook' : 'Registra webhook cancellazioni'}
                </SubmitButton>
              </form>
            )}
          </div>
        )}

        {!canManage && (
          <p className="mt-4 text-xs text-secondary">Solo un superadmin può gestire questa integrazione.</p>
        )}
      </div>

      {connection && (
        <div className="mx-6 mt-4 max-w-xl">
          <Link
            href="/dashboard/settings/fic/products"
            className="flex items-center gap-3 rounded-lg border border-grid-border p-4 transition hover:bg-row-hover"
          >
            <Package size={20} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-primary">Catalogo prodotti</p>
              <p className="text-xs text-secondary">Importa e sincronizza i prodotti da Fatture in Cloud</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
