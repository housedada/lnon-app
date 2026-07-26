'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useZenNoiseStore } from '@/lib/store/zenNoiseStore';

const EDGE_MARGIN = 16;
const COLLAPSED_WIDTH = 66;
const EXPANDED_MAX_WIDTH = 276;
const COLLAPSE_DELAY_MS = 2690;
const BALLOON_FADE_IN_MS = 660;
const BALLOON_FADE_OUT_MS = 360;
const RESIZE_TRANSITION = 'max-width 360ms cubic-bezier(0.4, 0, 0.2, 1)';
const SNAP_TRANSITION = 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';

type Anchor = 'left' | 'center' | 'right';

function anchorLeft(anchor: Anchor, width: number) {
  if (anchor === 'left') return EDGE_MARGIN;
  if (anchor === 'right') return window.innerWidth - width - EDGE_MARGIN;
  return (window.innerWidth - width) / 2;
}

/**
 * Balloon flottante per il rumore bianco, sullo stesso modello di
 * GlobalAudioPlayer (drag riposizionabile con snap magnetico, espansione in
 * hover) ma con icona SVG a gradiente animato al posto della cover art, e
 * niente drag/drop possibile a partire dall'area dell'icona.
 */
export default function ZenNoiseBalloon() {
  const active = useZenNoiseStore((s) => s.active);
  const toggleActive = useZenNoiseStore((s) => s.toggleActive);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startLeft: number; width: number; moved: boolean; currentLeft: number } | null>(null);
  const justDraggedRef = useRef(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredBalloon, setHoveredBalloon] = useState(false);
  const [expandedClick, setExpandedClick] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>('left');
  const [visible, setVisible] = useState(false);

  const expanded = hoveredBalloon || expandedClick;

  // Monta subito all'attivazione, ma resta montato durante il fade-out
  // (stessa logica di GlobalAudioPlayer): si smonta solo a dissolvenza finita.
  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), BALLOON_FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [active]);

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

  useLayoutEffect(() => clearCollapseTimer, []);

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
    // "visible" è in dipendenza apposta: al mount (quando passa a true) il
    // balloon deve posizionarsi subito, non solo alla prima interazione
    // (hover/drag) successiva che tocca anchor/expanded/active.
  }, [anchor, isDragging, expanded, active, visible]);

  useLayoutEffect(() => {
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

  if (!visible) return null;

  return (
    // Wrapper dedicato solo al fade di opacità: il div interno gestisce il
    // proprio "transition" via JS per il drag/snap (left, max-width), e
    // sovrascriverlo in toto avrebbe cancellato anche il fade opacity se
    // fosse stato sullo stesso elemento (bug: comparsa/scomparsa a scatto
    // invece che in dissolvenza, e "salto" al bordo sinistro al mount).
    <div style={{ opacity: active ? 1 : 0, transition: `opacity ${active ? BALLOON_FADE_IN_MS : BALLOON_FADE_OUT_MS}ms ease` }}>
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
        style={{
          bottom: 'calc(var(--spacing) * 6)',
          maxWidth: expanded ? EXPANDED_MAX_WIDTH : COLLAPSED_WIDTH,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* onPointerDown qui si ferma: l'area dell'icona non trascina il balloon */}
        <div onPointerDown={(e) => e.stopPropagation()} className="relative h-[66px] w-[66px] shrink-0 p-[6px]">
          <div className="zen-noise-icon h-full w-full rounded-full" aria-hidden="true" />
        </div>

        <div
          className={`flex min-w-0 shrink-0 items-center gap-2 pr-3 transition-opacity duration-150 ease-out ${
            expanded ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ transitionDelay: expanded ? '160ms' : '0ms' }}
        >
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-medium text-primary">HAL 9000</span>
            <span className="truncate text-[10px] text-secondary">Unità AE-35 = Error 404</span>
          </div>

          <button
            type="button"
            onClick={toggleActive}
            aria-label="Spegni rumore bianco"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
