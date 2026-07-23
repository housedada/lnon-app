import { create } from 'zustand';

export interface TaskBoardScrollColumn {
  id: string;
  label: string;
  /** Sfondo coerente col colore del progetto/membro collegato (plain o gradient) */
  background?: string;
}

interface TaskBoardScrollState {
  scrollContainer: HTMLDivElement | null;
  columns: TaskBoardScrollColumn[];
  columnRefs: Record<string, HTMLDivElement | null>;
  setScrollContainer: (el: HTMLDivElement | null) => void;
  setColumns: (cols: TaskBoardScrollColumn[]) => void;
  registerColumnRef: (id: string, el: HTMLDivElement | null) => void;
}

export const useTaskBoardScrollStore = create<TaskBoardScrollState>((set) => ({
  scrollContainer: null,
  columns: [],
  columnRefs: {},
  setScrollContainer: (el) => set({ scrollContainer: el }),
  setColumns: (cols) => set({ columns: cols }),
  registerColumnRef: (id, el) =>
    set((s) => ({ columnRefs: { ...s.columnRefs, [id]: el } })),
}));

export function scrollToColumn(id: string) {
  const { scrollContainer, columnRefs } = useTaskBoardScrollStore.getState();
  const columnEl = columnRefs[id];
  if (!scrollContainer || !columnEl) return;
  const left = columnEl.offsetLeft - scrollContainer.offsetLeft;
  scrollContainer.scrollTo({ left, behavior: 'smooth' });
}
