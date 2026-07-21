import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Pagina non trovata' };

export default function NotFound() {
  return (
    <div className="content-area flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-semibold tracking-tight text-primary">404</p>
      <p className="text-sm font-medium text-primary">Pagina non trovata</p>
      <p className="max-w-sm text-sm text-secondary">
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <Link
        href="/dashboard"
        className="btn-accent mt-2 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Torna alla dashboard
      </Link>
    </div>
  );
}
