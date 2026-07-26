import { create } from 'zustand';

/**
 * Segnale di "sto navigando la lista" condiviso tra ListNavigator e i widget
 * filtro esterni (ContractsFilterWidget, JobsFilterBar, ...): questi ultimi
 * fanno router.push() dalla loro istanza di useTransition, che ListNavigator
 * non può vedere — senza questo store il pacman/fade di ListNavigator non
 * scattava mai quando si filtrava da lì, solo su ricerca/paginazione interne.
 */
interface ListPendingState {
  pending: boolean;
  setPending: (pending: boolean) => void;
}

export const useListPendingStore = create<ListPendingState>((set) => ({
  pending: false,
  setPending: (pending) => set({ pending }),
}));
