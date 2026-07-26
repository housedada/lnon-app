'use client';

import { CirclePlay } from 'lucide-react';
import { useAudioPlayerStore } from '@/lib/store/audioPlayerStore';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

export default function AudioPlayerToggle() {
  const active = useAudioPlayerStore((s) => s.active);
  const toggleActive = useAudioPlayerStore((s) => s.toggleActive);
  const zenActive = useZenNoiseStore((s) => s.active);
  const setZenActive = useZenNoiseStore((s) => s.setActive);

  function handleClick() {
    // Musica e rumore bianco non coesistono: attivando l'una si spegne
    // l'altro (che farà il suo fade-out, mentre questa fa fade-in).
    if (!active && zenActive) setZenActive(false);
    toggleActive();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
