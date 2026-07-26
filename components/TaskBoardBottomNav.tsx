'use client';

import { useEffect, useRef } from 'react';
import { useTaskBoardScrollStore, scrollToColumn } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';

// Zona attiva ai bordi (px) entro cui il mouse innesca l'autoscroll, e velocità
// massima raggiunta appena a ridosso del bordo (px per frame, ~60fps) — tenuta
// bassa apposta per non essere invadente.
const EDGE_ZONE = 90;
const MAX_SPEED = 9;
// Quanto rapidamente la velocità corrente insegue quella target ad ogni frame:
// stesso easing sia per accelerare avvicinandosi al bordo sia per il "dolce"
// rallentamento quando il mouse esce dalla zona o dal container.
const EASE = 0.08;

function useEdgeAutoScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const targetSpeed = useRef(0);
  const currentSpeed = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame: number;
    function tick() {
      currentSpeed.current += (targetSpeed.current - currentSpeed.current) * EASE;
      if (Math.abs(currentSpeed.current) > 0.05 && el) {
        el.scrollLeft += currentSpeed.current;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    function handleMouseMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const distanceFromRight = rect.right - e.clientX;
      const distanceFromLeft = e.clientX - rect.left;

      if (distanceFromRight <= EDGE_ZONE) {
        targetSpeed.current = MAX_SPEED * (1 - distanceFromRight / EDGE_ZONE);
      } else if (distanceFromLeft <= EDGE_ZONE) {
        targetSpeed.current = -MAX_SPEED * (1 - distanceFromLeft / EDGE_ZONE);
      } else {
        targetSpeed.current = 0;
      }
    }
    function handleMouseLeave() {
      targetSpeed.current = 0;
    }

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref]);
}

export default function TaskBoardBottomNav() {
  const columns = useTaskBoardScrollStore((s) => s.columns);
  const density = useTaskBoardViewStore((s) => s.density);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEdgeAutoScroll(scrollRef);

  if (density === 'masonry' || columns.length === 0) return null;

  return (
    <div ref={scrollRef} className="sticky bottom-0 z-10 h-[66px] shrink-0 overflow-x-auto overflow-y-hidden">
      <div className="relative flex h-full min-w-max items-center gap-3 px-4">
        <div
          className="pointer-events-none absolute inset-x-4 top-1/2 h-0 -translate-y-1/2 border-t border-dashed"
          style={{ borderColor: 'color-mix(in srgb, var(--color-secondary) 35%, transparent)' }}
          aria-hidden="true"
        />
        {columns.map((col) => {
          const hasBackground = Boolean(col.background);
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => scrollToColumn(col.id)}
              title={col.label}
              style={hasBackground ? { background: col.background } : undefined}
              className={`relative z-10 shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-medium transition ${
                col.isSpecial
                  ? 'special-project-header special-project-border text-neutral-800 hover:brightness-95'
                  : hasBackground
                    ? 'border-transparent text-neutral-800 hover:brightness-95'
                    : 'border-grid-border text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              {col.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
