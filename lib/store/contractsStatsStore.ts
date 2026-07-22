import { create } from 'zustand';

interface ContractsStatsState {
  visible: boolean;
  toggle: () => void;
}

export const useContractsStatsStore = create<ContractsStatsState>((set) => ({
  visible: false,
  toggle: () => set((state) => ({ visible: !state.visible })),
}));
