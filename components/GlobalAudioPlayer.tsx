'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useAudioPlayerStore } from '@/lib/store/audioPlayerStore';

const FADE_MS = 6690;
const POSITION_KEY = 'lnon-audio-position';
const TRACK_SRC = '/audio/lnon.mp3';
const EDGE_MARGIN = 16;
const COLLAPSED_WIDTH = 66;
const EXPANDED_MAX_WIDTH = 260;
const COLLAPSE_DELAY_MS = 2690;
const RESIZE_TRANSITION = 'max-width 360ms cubic-bezier(0.4, 0, 0.2, 1)';
const SNAP_TRANSITION = 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';

type Anchor = 'left' | 'center' | 'right';

function anchorLeft(anchor: Anchor, width: number) {
  if (anchor === 'left') return EDGE_MARGIN;
  if (anchor === 'right') return window.innerWidth - width - EDGE_MARGIN;
  return (window.innerWidth - width) / 2;
}

export default function GlobalAudioPlayer() {
  const active = useAudioPlayerStore((s) => s.active);
  const playing = useAudioPlayerStore((s) => s.playing);
  const setPlaying = useAudioPlayerStore((s) => s.setPlaying);
  const toggleActive = useAudioPlayerStore((s) => s.toggleActive);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ startX: number; startLeft: number; width: number; moved: boolean; currentLeft: number } | null>(null);
  const justDraggedRef = useRef(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredAvatar, setHoveredAvatar] = useState(false);
  const [hoveredBalloon, setHoveredBalloon] = useState(false);
  const [expandedClick, setExpandedClick] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>('left');

  const expanded = hoveredBalloon || expandedClick;

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

  function clearCollapseTimer() {
    if (collapseTimerRef.current !== null) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }

  function scheduleCollapse() {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      collapseTimerRef.current = null;
      setHoveredBalloon(false);
    }, COLLAPSE_DELAY_MS);
  }

  useEffect(() => clearCollapseTimer, []);

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

  // Riposiziona il balloon in base all'ancora corrente (drag magnetico o resize).
  useLayoutEffect(() => {
    if (isDragging) return;
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const width = el.offsetWidth;
      el.style.transition = `${SNAP_TRANSITION}, ${RESIZE_TRANSITION}`;
      el.style.left = `${anchorLeft(anchor, width)}px`;
      el.style.right = 'auto';
      el.style.transform = 'none';
    };
    apply();
    const onResize = () => apply();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [anchor, isDragging, expanded, visible]);

  useEffect(() => {
    if (!isDragging) return;
    const el = containerRef.current;

    function onMove(e: PointerEvent) {
      const state = dragStateRef.current;
      if (!state || !el) return;
      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 4) state.moved = true;
      const newLeft = Math.min(Math.max(state.startLeft + dx, 8), window.innerWidth - state.width - 8);
      state.currentLeft = newLeft;
      el.style.transition = 'none';
      el.style.left = `${newLeft}px`;
      el.style.right = 'auto';
      el.style.transform = 'none';
    }

    function onUp() {
      const state = dragStateRef.current;
      if (state) {
        const centerX = state.currentLeft + state.width / 2;
        let next: Anchor = 'left';
        if (centerX > (window.innerWidth * 2) / 3) next = 'right';
        else if (centerX > window.innerWidth / 3) next = 'center';
        justDraggedRef.current = state.moved;
        setAnchor(next);
      }
      setIsDragging(false);
      scheduleCollapse();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  function handlePointerDown(e: React.PointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    clearCollapseTimer();
    const rect = el.getBoundingClientRect();
    dragStateRef.current = { startX: e.clientX, startLeft: rect.left, width: rect.width, moved: false, currentLeft: rect.left };
    setIsDragging(true);
  }

  function handleContainerClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setExpandedClick((v) => !v);
  }

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
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onClick={handleContainerClick}
          onMouseEnter={() => {
            clearCollapseTimer();
            setHoveredBalloon(true);
          }}
          onMouseLeave={() => {
            if (isDragging) return;
            scheduleCollapse();
          }}
          className="fixed z-50 flex h-[66px] touch-none select-none items-center overflow-hidden rounded-full border border-grid-border bg-card-bg shadow-lg"
          style={{ bottom: 'calc(var(--spacing) * 6)', maxWidth: expanded ? EXPANDED_MAX_WIDTH : COLLAPSED_WIDTH, cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            onMouseEnter={() => setHoveredAvatar(true)}
            onMouseLeave={() => setHoveredAvatar(false)}
            className="relative h-[66px] w-[66px] shrink-0 p-[6px]"
          >
            <div
              className={`h-full w-full rounded-full bg-cover bg-center ${playing ? 'audio-disc-spin' : ''}`}
              style={{ backgroundImage: "url('/fastasleep.jpg')" }}
            />

            {!hoveredAvatar && (
              <span className="audio-eq pointer-events-none absolute inset-[6px] flex items-center justify-center" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            {hoveredAvatar && (
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

          <div
            className={`flex min-w-0 shrink-0 items-center gap-2 pr-3 transition-opacity duration-150 ease-out ${
              expanded ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{ transitionDelay: expanded ? '160ms' : '0ms' }}
          >
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
        </div>
      )}
    </>
  );
}
