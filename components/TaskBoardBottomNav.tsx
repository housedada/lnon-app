'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { NotebookPen } from 'lucide-react';
import { useTaskBoardScrollStore, scrollToColumn } from '@/lib/store/taskBoardScrollStore';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';
import { useNotesSidebarStore } from '@/lib/store/notesSidebarStore';

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

// Animazione FLIP: quando il drag-and-drop sulle colonne cambia l'ordine,
// i pill non "saltano" di colpo alla nuova posizione — si registra la
// posizione precedente di ciascuno e si anima la differenza verso 0.
function useFlipAnimation(itemRefs: React.RefObject<Map<string, HTMLButtonElement>>, columns: { id: string }[]) {
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    itemRefs.current.forEach((el, id) => nextRects.set(id, el.getBoundingClientRect()));

    itemRefs.current.forEach((el, id) => {
      const prev = prevRects.current.get(id);
      const next = nextRects.get(id);
      if (!prev || !next) return;
      const dx = prev.left - next.left;
      if (Math.abs(dx) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
      el.getBoundingClientRect(); // forza il reflow prima di riattivare la transition
      requestAnimationFrame(() => {
        el.style.transition = 'transform 320ms ease';
        el.style.transform = '';
      });
    });

    prevRects.current = nextRects;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);
}

export default function TaskBoardBottomNav() {
  const columns = useTaskBoardScrollStore((s) => s.columns);
  const density = useTaskBoardViewStore((s) => s.density);
  const notesOpen = useNotesSidebarStore((s) => s.open);
  const toggleNotes = useNotesSidebarStore((s) => s.toggle);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  useEdgeAutoScroll(scrollRef);
  useFlipAnimation(itemRefs, columns);

  const showColumns = density !== 'masonry' && columns.length > 0;

  return (
    <div className="flex shrink-0 items-center border-t border-grid-border">
      <button
        type="button"
        onClick={toggleNotes}
        aria-label={notesOpen ? 'Chiudi Appunti' : 'Apri Appunti'}
        aria-pressed={notesOpen}
        title="Appunti"
        className={`flex h-[66px] w-[50px] shrink-0 items-center justify-center border-r border-grid-border transition ${
          notesOpen ? 'text-primary' : 'text-secondary hover:text-primary'
        }`}
      >
        <NotebookPen size={17} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {showColumns && (
        <div ref={scrollRef} className="h-[66px] flex-1 overflow-x-auto overflow-y-hidden">
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
                  ref={(el) => {
                    if (el) itemRefs.current.set(col.id, el);
                    else itemRefs.current.delete(col.id);
                  }}
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
      )}
    </div>
  );
}
