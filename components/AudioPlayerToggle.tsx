'use client';

import { CirclePlay } from 'lucide-react';
import { useAudioPlayerStore } from '@/lib/store/audioPlayerStore';

export default function AudioPlayerToggle() {
  const active = useAudioPlayerStore((s) => s.active);
  const toggleActive = useAudioPlayerStore((s) => s.toggleActive);

  return (
    <button
      type="button"
      onClick={toggleActive}
      aria-label="Attiva/disattiva musica di sottofondo"
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center transition ${
        active ? 'audio-toggle-active rounded-full text-white' : 'rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
      }`}
    >
      <CirclePlay size={21} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
