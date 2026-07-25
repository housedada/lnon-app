import { create } from 'zustand';

interface AudioPlayerState {
  active: boolean;
  playing: boolean;
  toggleActive: () => void;
  setPlaying: (playing: boolean) => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()((set) => ({
  active: false,
  playing: false,
  toggleActive: () => set((state) => ({ active: !state.active })),
  setPlaying: (playing) => set({ playing }),
}));
