'use client';

import Image from 'next/image';
import { signIn } from 'next-auth/react';
import packageJson from '../../../package.json';

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-900 to-black px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Image
          src="/logo.png"
          alt="Housedada"
          width={130}
          height={26}
          priority
        />

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/50 px-6 py-3 text-sm font-medium text-neutral-100 transition hover:bg-neutral-800"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
            />
          </svg>
          Accedi con Google
        </button>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-version-label">v{packageJson.version}</p>
    </div>
  );
}
