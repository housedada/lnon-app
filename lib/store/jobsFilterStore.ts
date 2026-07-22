import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JobsFilterState {
  visible: boolean;
  toggle: () => void;
}

export const useJobsFilterStore = create<JobsFilterState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-jobs-filter-widget' }
  )
);
