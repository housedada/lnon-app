'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';
import { grantSuperadminByEmailAction } from '@/lib/actions/access';
import { notify } from '@/lib/notify';

export default function GrantAccessForm() {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await grantSuperadminByEmailAction(email);
      notify(res.message);
      if (res.success) {
        setEmail('');
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="field-wrap flex-1 min-w-[240px]">
        <input
          type="email"
          id="grant-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder=" "
          className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
        />
        <label htmlFor="grant-email" className="field-floating-label">
          Email utente
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
        )}
        Concedi accesso superadmin
      </button>
    </form>
  );
}
