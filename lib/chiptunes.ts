// Motivetti retro-game sintetizzati via Web Audio API (nessun file audio/MIDI
// necessario), scelti a caso ad ogni riproduzione. Trascrizioni semplificate,
// non fedeli nota per nota agli originali.

// Tabella frequenze (Hz) per nome nota, ottave 3-6. 0 = pausa (nessun suono).
const SEMITONES: Record<string, number> = { C: -9, CS: -8, D: -7, DS: -6, E: -5, F: -4, FS: -3, G: -2, GS: -1, A: 0, AS: 1, B: 2 };
function freq(note: string, octave: number): number {
  const semitoneFromA4 = SEMITONES[note] + (octave - 4) * 12;
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}
const REST = 0;

export interface Tune {
  id: string;
  name: string;
  notes: number[];
  noteDurationS: number;
  noteGapS: number;
  volumeScale?: number;
  // Seconda voce simultanea (semitoni di distanza da ogni nota, es. -12 =
  // ottava sotto come basso): un accenno di polifonia per un suono più pieno,
  // più vicino all'originale rispetto a un'unica linea monofonica.
  harmonySemitones?: number;
  harmonyVolumeScale?: number;
}

// Pac-Man: le due frasi dell'apertura.
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
  harmonySemitones: -12,
  harmonyVolumeScale: 0.35,
};

// Super Mario Bros: il riff iniziale del tema principale (Overworld), molto
// più riconoscibile del tema sott'acqua che sostituisce.
const MARIO_OVERWORLD: Tune = {
  id: 'mario-overworld',
  name: 'Super Mario Bros',
  notes: [
    freq('E', 5), freq('E', 5), REST, freq('E', 5), REST,
    freq('C', 5), freq('E', 5), REST,
    freq('G', 5), REST, REST, REST,
    freq('G', 4), REST, REST, REST,
  ],
  noteDurationS: 0.14,
  noteGapS: 0.02,
};

// The Legend of Zelda: il jingle "segreto scoperto" (triade diminuita G/F#/D#
// con la A a chiudere), ripetuto un'ottava sopra.
const ZELDA_SECRET: Tune = {
  id: 'zelda-secret',
  name: 'The Legend of Zelda',
  notes: [
    freq('G', 4), freq('FS', 4), freq('DS', 4), freq('A', 4),
    freq('G', 5), freq('FS', 5), freq('DS', 5), freq('A', 5),
  ],
  noteDurationS: 0.1,
  noteGapS: 0.01,
  volumeScale: 1.15,
};

// Final Fantasy: la Victory Fanfare, forse la fanfara di vittoria più
// riconoscibile dei videogiochi.
const FINAL_FANTASY_VICTORY: Tune = {
  id: 'final-fantasy-victory',
  name: 'Final Fantasy',
  notes: [
    freq('C', 5), freq('C', 5), freq('C', 5), freq('C', 5),
    freq('GS', 4), freq('AS', 4), freq('C', 5), freq('C', 5),
  ],
  noteDurationS: 0.12,
  noteGapS: 0.012,
  harmonySemitones: -12,
  harmonyVolumeScale: 0.4,
};

// Sonic the Hedgehog: l'incipit di Green Hill Zone.
const SONIC_GREEN_HILL: Tune = {
  id: 'sonic-green-hill',
  name: 'Sonic the Hedgehog',
  notes: [
    freq('C', 5), freq('A', 4), freq('C', 5), freq('B', 4),
    freq('C', 5), freq('B', 4), freq('G', 4), freq('G', 4),
    freq('E', 4), freq('D', 4), freq('C', 4),
  ],
  noteDurationS: 0.115,
  noteGapS: 0.012,
};

// Mega Man: fanfara eroica in stile "select/title", un arpeggio ascendente e
// discendente su un accordo maggiore.
const MEGA_MAN: Tune = {
  id: 'mega-man',
  name: 'Mega Man',
  notes: [
    freq('C', 5), freq('E', 5), freq('G', 5), freq('C', 6),
    freq('G', 5), freq('E', 5), freq('C', 5),
  ],
  noteDurationS: 0.1,
  noteGapS: 0.014,
  volumeScale: 1.05,
};

// Metroid: la fanfara di raccolta oggetto/power-up, brevissima e iconica.
const METROID_ITEM: Tune = {
  id: 'metroid-item',
  name: 'Metroid',
  notes: [
    freq('D', 5), freq('D', 5), freq('E', 5), freq('E', 5),
    freq('FS', 5), freq('FS', 5), freq('A', 5), freq('A', 5),
    freq('D', 6),
  ],
  noteDurationS: 0.1,
  noteGapS: 0.008,
  volumeScale: 1.1,
};

// Castlevania: il riff di apertura di "Vampire Killer".
const CASTLEVANIA_VAMPIRE_KILLER: Tune = {
  id: 'castlevania-vampire-killer',
  name: 'Castlevania',
  notes: [
    freq('C', 5), freq('C', 5), REST, freq('AS', 4), freq('C', 5), REST,
    freq('G', 4), REST, REST,
    freq('C', 5), freq('C', 5), REST, freq('AS', 4), freq('C', 5), REST,
    freq('D', 5), REST, REST,
  ],
  noteDurationS: 0.115,
  noteGapS: 0.015,
};

// Kirby: le prime battute del tema "Green Greens".
const KIRBY_GREEN_GREENS: Tune = {
  id: 'kirby-green-greens',
  name: 'Kirby',
  notes: [
    freq('G', 4), freq('C', 5), freq('E', 5), freq('G', 5),
    freq('E', 5), freq('C', 5), freq('D', 5), freq('G', 4),
  ],
  noteDurationS: 0.13,
  noteGapS: 0.016,
  volumeScale: 1.05,
};

// Pokémon: il breve jingle di apertura del Centro Pokémon.
const POKEMON_CENTER: Tune = {
  id: 'pokemon-center',
  name: 'Pokémon',
  notes: [
    freq('E', 5), freq('B', 4), freq('C', 5), freq('D', 5),
    freq('G', 5), freq('FS', 5), freq('E', 5), freq('D', 5),
    freq('C', 5), freq('B', 4),
  ],
  noteDurationS: 0.12,
  noteGapS: 0.014,
  harmonySemitones: -12,
  harmonyVolumeScale: 0.3,
};

// Street Fighter II: l'incipit dello stage-select/character-select.
const STREET_FIGHTER_II: Tune = {
  id: 'street-fighter-ii',
  name: 'Street Fighter II',
  notes: [
    freq('C', 5), freq('D', 5), freq('DS', 5), freq('G', 5),
    freq('DS', 5), freq('D', 5), freq('C', 5),
    freq('AS', 4), freq('C', 5),
  ],
  noteDurationS: 0.11,
  noteGapS: 0.013,
  volumeScale: 1.1,
};

// Contra: il breve riff d'apertura del tema della jungla (stage 1).
const CONTRA_JUNGLE: Tune = {
  id: 'contra-jungle',
  name: 'Contra',
  notes: [
    freq('E', 4), freq('E', 4), freq('E', 5), REST,
    freq('E', 4), freq('E', 4), freq('D', 5), REST,
    freq('E', 4), freq('E', 4), freq('C', 5), freq('B', 4),
  ],
  noteDurationS: 0.105,
  noteGapS: 0.012,
};

export const TUNES: Tune[] = [
  PACMAN, DONKEY_KONG, TETRIS, MARIO_OVERWORLD, ZELDA_SECRET, FINAL_FANTASY_VICTORY, SONIC_GREEN_HILL, MEGA_MAN,
  METROID_ITEM, CASTLEVANIA_VAMPIRE_KILLER, KIRBY_GREEN_GREENS, POKEMON_CENTER, STREET_FIGHTER_II, CONTRA_JUNGLE,
];
export const RANDOM_CHOICE = 'random';
export const CHIPTUNE_CHOICE_STORAGE_KEY = 'lnon-chiptune-choice';

const BASE_VOLUME = 0.0064;

// Tonalità randomizzata ad ogni riproduzione, per varietà: si può scendere
// parecchio ma si sale poco (evita che risulti troppo acuto/fastidioso).
function randomPitchShift(): number {
  const semitones = -9 + Math.random() * 11; // range [-9, +2]
  return Math.pow(2, semitones / 12);
}

function scheduleNote(ctx: AudioContext, master: GainNode, noteFreq: number, gainScale: number, t: number, durationS: number) {
  if (noteFreq <= 0) return; // pausa
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = noteFreq;
  osc.connect(gain);
  gain.connect(master);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(gainScale, t + 0.008);
  gain.gain.setValueAtTime(gainScale, t + durationS - 0.02);
  gain.gain.linearRampToValueAtTime(0, t + durationS);

  osc.start(t);
  osc.stop(t + durationS);
}

function playTune(tune: Tune): void {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const master = ctx.createGain();
  master.gain.value = BASE_VOLUME * (tune.volumeScale ?? 1);
  master.connect(ctx.destination);

  // Schedulare le note PRIMA che il contesto sia davvero "running" le
  // affida a un currentTime che con un contesto sospeso non avanza in modo
  // affidabile — stesso bug già visto e corretto nel rumore bianco (la
  // rampa collassava di colpo). Qui si programma tutto solo a resume avvenuto.
  function schedule() {
    const pitchShift = randomPitchShift();
    const harmonyRatio = tune.harmonySemitones !== undefined ? Math.pow(2, tune.harmonySemitones / 12) : undefined;

    let t = ctx.currentTime + 0.02;
    for (const noteFreq of tune.notes) {
      const shifted = noteFreq * pitchShift;
      scheduleNote(ctx, master, shifted, 1, t, tune.noteDurationS);
      if (harmonyRatio !== undefined) {
        scheduleNote(ctx, master, shifted * harmonyRatio, tune.harmonyVolumeScale ?? 0.4, t, tune.noteDurationS);
      }
      t += tune.noteDurationS + tune.noteGapS;
    }

    const totalMs = (t - ctx.currentTime + 0.1) * 1000;
    setTimeout(() => ctx.close(), totalMs);
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(schedule);
  } else {
    schedule();
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
