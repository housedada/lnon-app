import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InvoicesFilterState {
  visible: boolean;
  toggle: () => void;
}

export const useInvoicesFilterStore = create<InvoicesFilterState>()(
  persist(
    (set) => ({
      visible: false,
      toggle: () => set((state) => ({ visible: !state.visible })),
    }),
    { name: 'lnon-invoices-filter-widget' }
  )
);
