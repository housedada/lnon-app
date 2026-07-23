import { create } from 'zustand';

interface TaskBoardExpandState {
  /** true = tutto espanso (stato di riferimento dell'ultimo click) */
  expanded: boolean;
  /** incrementa a ogni click, così le board possono reagire anche se `expanded` non cambia */
  signal: number;
  toggle: () => void;
}

export const useTaskBoardExpandStore = create<TaskBoardExpandState>((set) => ({
  expanded: true,
  signal: 0,
  toggle: () => set((s) => ({ expanded: !s.expanded, signal: s.signal + 1 })),
}));
