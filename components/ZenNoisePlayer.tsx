'use client';

import { useEffect, useRef } from 'react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

const VOLUME = 0.06;
const BUFFER_SECONDS = 2;

/**
 * Rumore bianco calmante generato via Web Audio API (nessun file audio),
 * stesso principio del motivetto intro di Pac-Man: un buffer di rumore
 * casuale in loop, ammorbidito da un filtro passa-basso, al 69% di volume.
 * Si avvia/ferma con lo store zenNoise, indipendente dalla musica di
 * sottofondo (AudioPlayerToggle) — possono stare attivi insieme.
 */
export default function ZenNoisePlayer() {
  const active = useZenNoiseStore((s) => s.active);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) return;

    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = ctxRef.current ?? new AudioContextCtor();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * BUFFER_SECONDS;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Passa-basso leggero: ammorbidisce il rumore bianco puro (troppo
    // sibilante) verso qualcosa di più simile a un rumore rosa/calmante.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;

    const gain = ctx.createGain();
    gain.gain.value = VOLUME;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    return () => {
      source.stop();
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }, [active]);

  return null;
}
