'use client';

import { useEffect } from 'react';
import { playRandomChiptune } from '@/lib/chiptunes';

const STORAGE_KEY = 'pacman-intro-last-played';
// TEMP: per testare la melodia aggiornata, riproduce ad ogni refresh invece
// che una volta al giorno. Rimettere a false a test finiti.
const ALWAYS_PLAY_FOR_TESTING = true;

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Fa suonare un motivetto retro-game a caso (Pac-Man, Donkey Kong, Tetris,
 * Super Mario sott'acqua, ...) una sola volta al giorno: al login, o al
 * primo accesso dopo mezzanotte. Non è legato alla comparsa del
 * PacmanLoader (che può ricomparire molte volte al giorno durante l'uso
 * normale) — solo al primo "ingresso" nell'app della giornata.
 */
export default function PacmanIntroPlayer() {
  useEffect(() => {
    const today = todayKey();
    if (!ALWAYS_PLAY_FOR_TESTING && localStorage.getItem(STORAGE_KEY) === today) return;

    function markPlayedAndPlay() {
      localStorage.setItem(STORAGE_KEY, today);
      playRandomChiptune();
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
