'use client';

import { useEffect, useRef } from 'react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

const VOLUME = 0.018;
const BUFFER_SECONDS = 2;
const FADE_S = 6;

/**
 * Rumore bianco calmante generato via Web Audio API (nessun file audio),
 * stesso principio del motivetto intro di Pac-Man: un buffer di rumore
 * casuale in loop, ammorbidito da un filtro passa-basso. Fade in/out di 6s
 * (si alterna con la musica di sottofondo, mai in contemporanea).
 */
export default function ZenNoisePlayer() {
  const active = useZenNoiseStore((s) => s.active);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stopTimeoutRef.current !== null) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    if (active) {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = ctxRef.current ?? new AudioContextCtor();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      if (!sourceRef.current) {
        const bufferSize = ctx.sampleRate * BUFFER_SECONDS;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        // Rumore "bruno" (integrazione con leak del rumore bianco): a parità
        // di gain è percepito molto più morbido/attutito del bianco puro,
        // che ha energia piena su tutte le frequenze ed è percettivamente
        // molto più "forte" anche a volumi bassi.
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // Passa-basso stretto: taglia ulteriormente le frequenze alte,
        // lasciando solo un rombo di sottofondo morbido.
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        sourceRef.current = source;
        gainRef.current = gain;
      }

      const gain = gainRef.current;
      if (gain) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_S);
      }
    } else {
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      const source = sourceRef.current;
      if (!ctx || !gain || !source) return;

      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_S);

      stopTimeoutRef.current = setTimeout(() => {
        source.stop();
        source.disconnect();
        gain.disconnect();
        sourceRef.current = null;
        gainRef.current = null;
        stopTimeoutRef.current = null;
      }, FADE_S * 1000 + 100);
    }

    return () => {
      if (stopTimeoutRef.current !== null) clearTimeout(stopTimeoutRef.current);
    };
  }, [active]);

  return null;
}
