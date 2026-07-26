import { create } from 'zustand';

interface ZenNoiseState {
  active: boolean;
  toggleActive: () => void;
}

export const useZenNoiseStore = create<ZenNoiseState>()((set) => ({
  active: false,
  toggleActive: () => set((state) => ({ active: !state.active })),
}));
