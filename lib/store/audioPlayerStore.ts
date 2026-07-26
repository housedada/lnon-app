import { create } from 'zustand';

interface AudioPlayerState {
  active: boolean;
  playing: boolean;
  // true finché il balloon Funki Porcini è a schermo, incluso durante il
  // fade-out (si smonta solo a dissolvenza finita) — usato da ZenNoiseBalloon
  // per sapersi impilare sopra invece di sovrapporsi.
  visible: boolean;
  toggleActive: () => void;
  setActive: (active: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setVisible: (visible: boolean) => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()((set) => ({
  active: false,
  playing: false,
  visible: false,
  toggleActive: () => set((state) => ({ active: !state.active })),
  setActive: (active) => set({ active }),
  setPlaying: (playing) => set({ playing }),
  setVisible: (visible) => set({ visible }),
}));
