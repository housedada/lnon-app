'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableColumnRenderArgs {
  setNodeRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  style: CSSProperties;
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
  isDragging: boolean;
}

/**
 * Wrapper sottile su useSortable (dnd-kit): niente markup proprio, espone via
 * render-prop tutto il necessario per rendere sortable un elemento esistente
 * (colonna progetto/membro) senza dover cambiare la sua struttura HTML/CSS.
 */
export default function SortableColumn({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (args: SortableColumnRenderArgs) => ReactNode;
}) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  return <>{children({ setNodeRef, setActivatorNodeRef, style, attributes, listeners, isDragging })}</>;
}
