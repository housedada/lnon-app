'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_INVITED: 'Il tuo account non è ancora stato invitato. Contatta un amministratore.',
  USER_INACTIVE: 'Il tuo account è stato disattivato. Contatta un amministratore.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error') ?? '';
  const message = ERROR_MESSAGES[errorCode] ?? 'Si è verificato un errore durante l\'accesso.';

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-100">Accesso non riuscito</h1>
      <p className="text-sm text-neutral-400">{message}</p>
      <Link
        href="/auth/signin"
        className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-6 py-3 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800"
      >
        Torna al login
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-900 to-black px-4">
      <Suspense fallback={null}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
