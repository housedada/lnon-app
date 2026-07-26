import { create } from 'zustand';
import { useTaskBoardViewStore } from '@/lib/store/taskBoardViewStore';

export interface TaskBoardScrollColumn {
  id: string;
  label: string;
  /** Sfondo coerente col colore del progetto/membro collegato (plain o gradient) */
  background?: string;
  /** Progetto generato da un contratto a conteggio orario: stesso trattamento ocra della card */
  isSpecial?: boolean;
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
  // In vista Lista il contenuto scorre in verticale: le stesse "ancore" della
  // navbar in basso puntano allo scroll verticale invece che orizzontale.
  if (useTaskBoardViewStore.getState().density === 'list') {
    const top = columnEl.offsetTop - scrollContainer.offsetTop;
    scrollContainer.scrollTo({ top, behavior: 'smooth' });
    return;
  }
  const left = columnEl.offsetLeft - scrollContainer.offsetLeft;
  scrollContainer.scrollTo({ left, behavior: 'smooth' });
}
