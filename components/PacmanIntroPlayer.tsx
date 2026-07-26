'use client';

import { useEffect } from 'react';
import { playPacmanIntro } from '@/lib/pacmanTune';

const STORAGE_KEY = 'pacman-intro-last-played';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Fa suonare il motivetto di apertura di Pac-Man una sola volta al giorno:
 * al login, o al primo accesso dopo mezzanotte. Non è legato alla comparsa
 * del PacmanLoader (che può ricomparire molte volte al giorno durante l'uso
 * normale) — solo al primo "ingresso" nell'app della giornata.
 */
export default function PacmanIntroPlayer() {
  useEffect(() => {
    const today = todayKey();
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    function markPlayedAndPlay() {
      localStorage.setItem(STORAGE_KEY, today);
      playPacmanIntro();
    }

    // I browser bloccano l'audio senza un gesto dell'utente sulla pagina
    // corrente: proviamo subito (spesso funziona, es. Safari dopo un redirect
    // di login), e se il contesto resta sospeso aspettiamo la prima
    // interazione per riprovare, una tantum.
    try {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const probe = new AudioContextCtor();
      const blocked = probe.state === 'suspended';
      probe.close();

      if (!blocked) {
        markPlayedAndPlay();
        return;
      }
    } catch {
      return;
    }

    function handleFirstInteraction() {
      markPlayedAndPlay();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    }
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  return null;
}
