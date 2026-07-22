import { create } from 'zustand';

interface ContractsFilterState {
  visible: boolean;
  toggle: () => void;
}

export const useContractsFilterStore = create<ContractsFilterState>((set) => ({
  visible: false,
  toggle: () => set((state) => ({ visible: !state.visible })),
}));
