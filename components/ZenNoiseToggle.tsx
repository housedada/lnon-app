'use client';

import { Waves } from 'lucide-react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';
import { useAudioPlayerStore } from '@/lib/store/audioPlayerStore';

export default function ZenNoiseToggle() {
  const active = useZenNoiseStore((s) => s.active);
  const toggleActive = useZenNoiseStore((s) => s.toggleActive);
  const audioActive = useAudioPlayerStore((s) => s.active);
  const setAudioActive = useAudioPlayerStore((s) => s.setActive);

  function handleClick() {
    // Musica e rumore bianco non coesistono: attivando l'uno si spegne
    // l'altra (che farà il suo fade-out, mentre questo fa fade-in).
    if (!active && audioActive) setAudioActive(false);
    toggleActive();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
