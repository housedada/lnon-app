import { create } from 'zustand';

interface ProjectInvoicesSelectionState {
  selected: string[];
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clear: () => void;
}

export const useProjectInvoicesSelectionStore = create<ProjectInvoicesSelectionState>((set) => ({
  selected: [],
  toggleSelect: (id) =>
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    })),
  selectMany: (ids) =>
    set((s) => {
      const allSelected = ids.length > 0 && ids.every((id) => s.selected.includes(id));
      if (allSelected) {
        return { selected: s.selected.filter((id) => !ids.includes(id)) };
      }
      return { selected: Array.from(new Set([...s.selected, ...ids])) };
    }),
  clear: () => set({ selected: [] }),
}));
