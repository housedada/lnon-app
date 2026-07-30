import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotesSidebarState {
  open: boolean;
  toggle: () => void;
}

export const useNotesSidebarStore = create<NotesSidebarState>()(
  persist(
    (set) => ({
      open: false,
      toggle: () => set((s) => ({ open: !s.open })),
    }),
    { name: 'lnon-notes-sidebar-open' }
  )
);
