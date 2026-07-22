'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export default function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} ${pending ? 'opacity-70' : ''}`}>
      {pending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
