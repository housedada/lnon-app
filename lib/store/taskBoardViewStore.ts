import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskBoardDensity = 'narrow' | 'wide' | 'masonry';

interface TaskBoardViewState {
  density: TaskBoardDensity;
  setDensity: (density: TaskBoardDensity) => void;
}

export const useTaskBoardViewStore = create<TaskBoardViewState>()(
  persist(
    (set) => ({
      density: 'narrow',
      setDensity: (density) => set({ density }),
    }),
    { name: 'lnon-task-board-density' }
  )
);
