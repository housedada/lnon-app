'use client';

import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { updateUserColorAction } from '@/lib/actions/users';
import { notify } from '@/lib/notify';
import { USER_TAG_COLORS } from '@/lib/types';

export default function UserColorPicker({ currentColor }: { currentColor?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(color: string) {
    startTransition(async () => {
      const res = await updateUserColorAction(color);
      notify(res.message);
    });
  }

  return (
    <div className="grid grid-cols-6 gap-1.5 px-3 py-2">
      {USER_TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          disabled={isPending}
          onClick={() => handleSelect(color)}
          aria-label={`Seleziona colore ${color}`}
          aria-pressed={currentColor === color}
          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:scale-110 disabled:opacity-60"
          style={{ background: color }}
        >
          {currentColor === color && <Check size={12} strokeWidth={2.5} className="text-neutral-700" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
