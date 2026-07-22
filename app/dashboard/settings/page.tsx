import Link from 'next/link';
import { Plug, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Impostazioni' };

export default function SettingsPage() {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Impostazioni</h1>

      <div className="mx-6 mt-6 max-w-xl">
        <Link
          href="/dashboard/settings/fic"
          className="flex items-center gap-3 rounded-lg border border-grid-border p-4 transition hover:bg-row-hover"
        >
          <Plug size={20} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-primary">Fatture in Cloud</p>
            <p className="text-xs text-secondary">Collega l&apos;account e sincronizza l&apos;anagrafica clienti</p>
          </div>
        </Link>

        <Link
          href="/dashboard/settings/access"
          className="mt-3 flex items-center gap-3 rounded-lg border border-grid-border p-4 transition hover:bg-row-hover"
        >
          <ShieldCheck size={20} strokeWidth={1.75} className="text-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-primary">Gestione Accessi</p>
            <p className="text-xs text-secondary">Concedi o revoca l&apos;accesso superadmin (solo superadmin)</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
