'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useAudioPlayerStore } from '@/lib/store/audioPlayerStore';

const FADE_MS = 6690;
const POSITION_KEY = 'lnon-audio-position';
const TRACK_SRC = '/audio/lnon.mp3';

export default function GlobalAudioPlayer() {
  const active = useAudioPlayerStore((s) => s.active);
  const playing = useAudioPlayerStore((s) => s.playing);
  const setPlaying = useAudioPlayerStore((s) => s.setPlaying);
  const toggleActive = useAudioPlayerStore((s) => s.toggleActive);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const saved = sessionStorage.getItem(POSITION_KEY);
    if (saved) {
      const t = parseFloat(saved);
      if (!Number.isNaN(t)) {
        audio.currentTime = t;
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const savePosition = () => {
      sessionStorage.setItem(POSITION_KEY, String(audio.currentTime));
    };
    audio.addEventListener('timeupdate', savePosition);
    window.addEventListener('beforeunload', savePosition);
    return () => {
      audio.removeEventListener('timeupdate', savePosition);
      window.removeEventListener('beforeunload', savePosition);
    };
  }, []);

  function cancelFade() {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }

  function fadeTo(target: number, onDone?: () => void) {
    const audio = audioRef.current;
    if (!audio) return;
    cancelFade();
    const start = audio.volume;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / FADE_MS, 1);
      const volume = start + (target - start) * progress;
      if (audio) audio.volume = Math.max(0, Math.min(1, volume));
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
    const audio = audioRef.current;
    if (!audio) return;

    if (active) {
      queueMicrotask(() => setVisible(true));
      audio.volume = 0;
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
      fadeTo(1);
    } else {
      fadeTo(0, () => {
        audio.pause();
        setPlaying(false);
        setVisible(false);
      });
    }

    return () => cancelFade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} loop preload="auto" />

      {visible && (
        <div
          className="fixed bottom-16 left-4 z-50 flex h-[66px] items-center gap-2.5 rounded-full border border-grid-border bg-card-bg pr-3 shadow-lg"
        >
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative h-[66px] w-[66px] shrink-0 p-[6px]"
          >
            <div
              className={`h-full w-full rounded-full bg-cover bg-center ${playing ? 'audio-disc-spin' : ''}`}
              style={{ backgroundImage: "url('/fastasleep.jpg')" }}
            />

            {!hovered && (
              <span className="audio-eq pointer-events-none absolute inset-[6px] flex items-center justify-center" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            {hovered && (
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={playing ? 'Pausa' : 'Riproduci'}
                className="absolute inset-[6px] flex items-center justify-center rounded-full bg-black/50 text-white"
              >
                {playing ? (
                  <Pause size={16} strokeWidth={2} fill="currentColor" />
                ) : (
                  <Play size={16} strokeWidth={2} fill="currentColor" />
                )}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-medium text-primary">Funki Porcini</span>
            <span className="truncate text-[10px] text-secondary">Last Night Over Norway (slowed)</span>
          </div>

          <button
            type="button"
            onClick={toggleActive}
            aria-label="Spegni player"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      )}
    </>
  );
}
