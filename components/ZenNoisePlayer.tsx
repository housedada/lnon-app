'use client';

import { useEffect, useRef } from 'react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

const VOLUME = 0.018;
const BUFFER_SECONDS = 2;
const FADE_MS = 690;

/**
 * Rumore bianco calmante generato via Web Audio API (nessun file audio),
 * stesso principio del motivetto intro di Pac-Man: un buffer di rumore
 * casuale in loop, ammorbidito da un filtro passa-basso. Fade in/out di
 * 690ms (si alterna con la musica di sottofondo, mai in contemporanea).
 *
 * Il volume è animato "a mano" frame per frame (rAF) invece di affidarsi a
 * GainNode.linearRampToValueAtTime: quella rampa nativa viene schedulata
 * rispetto al clock interno dell'AudioContext, che con un contesto ancora
 * sospeso non avanza in modo affidabile — risultato, il volume "esplodeva"
 * di colpo al target invece di salire dolcemente. Il fade manuale (stessa
 * tecnica già usata in GlobalAudioPlayer per la musica) è immune al problema.
 */
export default function ZenNoisePlayer() {
  const active = useZenNoiseStore((s) => s.active);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fadeFrameRef = useRef<number | null>(null);

  function cancelFade() {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }

  function fadeTo(target: number, onDone?: () => void) {
    const gain: GainNode | null = gainRef.current;
    if (!gain) return;
    cancelFade();
    const start = gain.gain.value;
    const startTime = performance.now();

    function step(now: number) {
      const progress = Math.min((now - startTime) / FADE_MS, 1);
      gain!.gain.value = start + (target - start) * progress;
      if (progress < 1) {
        fadeFrameRef.current = requestAnimationFrame(step);
      } else {
        fadeFrameRef.current = null;
        onDone?.();
      }
    }
    fadeFrameRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
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
        // di gain è percepito molto più morbido/attutito del bianco puro.
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = Math.max(-1, Math.min(1, lastOut * 3.5));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        sourceRef.current = source;
        gainRef.current = gain;
      }

      fadeTo(VOLUME);
    } else {
      const source = sourceRef.current;
      const gain = gainRef.current;
      if (!source || !gain) return;

      fadeTo(0, () => {
        source.stop();
        source.disconnect();
        gain.disconnect();
        sourceRef.current = null;
        gainRef.current = null;
      });
    }

    return () => {
      cancelFade();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}
