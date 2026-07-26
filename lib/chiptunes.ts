// Motivetti retro-game sintetizzati via Web Audio API (nessun file audio/MIDI
// necessario), scelti a caso ad ogni riproduzione. Trascrizioni semplificate,
// non fedeli nota per nota agli originali.

// Tabella frequenze (Hz) per nome nota, ottave 3-6.
const SEMITONES: Record<string, number> = { C: -9, CS: -8, D: -7, DS: -6, E: -5, F: -4, FS: -3, G: -2, GS: -1, A: 0, AS: 1, B: 2 };
function freq(note: string, octave: number): number {
  const semitoneFromA4 = SEMITONES[note] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

export interface Tune {
  id: string;
  name: string;
  notes: number[];
  noteDurationS: number;
  noteGapS: number;
  volumeScale?: number;
}

// Pac-Man: le due frasi dell'apertura, tonalità abbassata (~ottava e mezza).
const PACMAN: Tune = {
  id: 'pacman',
  name: 'Pac-Man',
  notes: [
    freq('B', 3), freq('B', 4), freq('FS', 4), freq('DS', 4),
    freq('B', 4), freq('FS', 4), freq('DS', 4),
    freq('C', 4), freq('C', 5), freq('G', 4), freq('E', 4),
    freq('C', 5), freq('G', 4), freq('E', 4),
  ],
  noteDurationS: 0.125,
  noteGapS: 0.018,
};

// Donkey Kong: il breve motivo/fanfara di inizio partita.
const DONKEY_KONG: Tune = {
  id: 'donkey-kong',
  name: 'Donkey Kong',
  notes: [
    freq('C', 4), freq('E', 4), freq('G', 4), freq('C', 5),
    freq('G', 4), freq('C', 5), freq('E', 5), freq('C', 5),
    freq('G', 4), freq('E', 4), freq('C', 4),
  ],
  noteDurationS: 0.13,
  noteGapS: 0.02,
  volumeScale: 1.1,
};

// Tetris: apertura di Korobeiniki (tema A).
const TETRIS: Tune = {
  id: 'tetris',
  name: 'Tetris',
  notes: [
    freq('E', 5), freq('B', 4), freq('C', 5), freq('D', 5),
    freq('C', 5), freq('B', 4), freq('A', 4), freq('A', 4),
    freq('C', 5), freq('E', 5), freq('D', 5), freq('C', 5),
    freq('B', 4), freq('C', 5), freq('D', 5), freq('E', 5),
    freq('C', 5), freq('A', 4), freq('A', 4),
  ],
  noteDurationS: 0.15,
  noteGapS: 0.015,
};

// Super Mario Bros: motivo del tema sott'acqua (Koji Kondo).
const MARIO_UNDERWATER: Tune = {
  id: 'mario-underwater',
  name: 'Super Mario Bros (sott’acqua)',
  notes: [
    freq('C', 4), freq('E', 4), freq('G', 4), freq('C', 5),
    freq('E', 5), freq('D', 5), freq('C', 5), freq('G', 4),
    freq('A', 4), freq('C', 5), freq('E', 5), freq('D', 5),
    freq('C', 5), freq('B', 4), freq('A', 4), freq('G', 4),
  ],
  noteDurationS: 0.185,
  noteGapS: 0.03,
  volumeScale: 0.9,
};

export const TUNES: Tune[] = [PACMAN, DONKEY_KONG, TETRIS, MARIO_UNDERWATER];
export const RANDOM_CHOICE = 'random';
export const CHIPTUNE_CHOICE_STORAGE_KEY = 'lnon-chiptune-choice';

const BASE_VOLUME = 0.0064; // metà del volume precedente (0.0128)
const GLOBAL_PITCH_SHIFT = Math.pow(2, -2 / 12); // un tono sotto, applicato a tutte le melodie

function playTune(tune: Tune): void {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const master = ctx.createGain();
  master.gain.value = BASE_VOLUME * (tune.volumeScale ?? 1);
  master.connect(ctx.destination);

  let t = ctx.currentTime + 0.02;
  for (const noteFreq of tune.notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = noteFreq * GLOBAL_PITCH_SHIFT;
    osc.connect(gain);
    gain.connect(master);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.008);
    gain.gain.setValueAtTime(1, t + tune.noteDurationS - 0.02);
    gain.gain.linearRampToValueAtTime(0, t + tune.noteDurationS);

    osc.start(t);
    osc.stop(t + tune.noteDurationS);
    t += tune.noteDurationS + tune.noteGapS;
  }

  const totalMs = (t - ctx.currentTime + 0.1) * 1000;
  setTimeout(() => ctx.close(), totalMs);

  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

export function playRandomChiptune(): void {
  const tune = TUNES[Math.floor(Math.random() * TUNES.length)];
  playTune(tune);
}

export function playChiptuneById(id: string): void {
  const tune = TUNES.find((t) => t.id === id);
  if (tune) playTune(tune);
}

/** Legge la preferenza salvata e riproduce quella, o una a caso se 'random'/assente. */
export function playSavedChiptuneChoice(): void {
  const choice = localStorage.getItem(CHIPTUNE_CHOICE_STORAGE_KEY);
  if (choice && choice !== RANDOM_CHOICE) {
    const tune = TUNES.find((t) => t.id === choice);
    if (tune) {
      playTune(tune);
      return;
    }
  }
  playRandomChiptune();
}
