import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContractsFilterState {
  visible: boolean;
  toggle: () => void;
}

export const useContractsFilterStore = create<ContractsFilterState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-contracts-filter-widget' }
  )
);
