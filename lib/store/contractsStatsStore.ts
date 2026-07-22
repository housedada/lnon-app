import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContractsStatsState {
  visible: boolean;
  toggle: () => void;
}

export const useContractsStatsStore = create<ContractsStatsState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-contracts-stats-widget' }
  )
);
