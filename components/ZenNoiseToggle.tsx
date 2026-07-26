'use client';

import { Waves } from 'lucide-react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

export default function ZenNoiseToggle() {
  const active = useZenNoiseStore((s) => s.active);
  const toggleActive = useZenNoiseStore((s) => s.toggleActive);

  return (
    <button
      type="button"
      onClick={toggleActive}
      aria-label="Attiva/disattiva rumore bianco calmante"
      aria-pressed={active}
      title="Rumore bianco calmante"
      className={`flex h-8 w-8 items-center justify-center transition ${
        active ? 'audio-toggle-active rounded-full text-white' : 'rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
      }`}
    >
      <Waves size={19} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
