import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpecialProjectsVisibilityState {
  visible: boolean;
  toggle: () => void;
}

export const useSpecialProjectsVisibilityStore = create<SpecialProjectsVisibilityState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-special-projects-visibility' }
  )
);
