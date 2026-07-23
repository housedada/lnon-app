import { create } from 'zustand';

interface TaskBoardScrollState {
  scrollContainer: HTMLDivElement | null;
  columns: { id: string; label: string }[];
  columnRefs: Record<string, HTMLDivElement | null>;
  setScrollContainer: (el: HTMLDivElement | null) => void;
  setColumns: (cols: { id: string; label: string }[]) => void;
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
