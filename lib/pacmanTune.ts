// Motivetto di apertura di Pac-Man, sintetizzato via Web Audio API (nessun
// file audio/MIDI necessario). Trascrizione semplificata: le due frasi
// principali dell'intro seguite dal caratteristico giro cromatico finale.
const NOTE = {
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  DS5: 622.25,
  E5: 659.25,
  F5: 698.46,
  FS5: 739.99,
  G5: 783.99,
  GS5: 830.61,
  A5: 880.0,
  AS5: 932.33,
  B5: 987.77,
  C6: 1046.5,
} as const;

const PHRASE_A = [NOTE.B4, NOTE.B5, NOTE.FS5, NOTE.DS5, NOTE.B5, NOTE.FS5, NOTE.DS5];
const PHRASE_B = [NOTE.C5, NOTE.C6, NOTE.G5, NOTE.E5, NOTE.C6, NOTE.G5, NOTE.E5];
// Giro cromatico che chiude l'intro, discendente e poi risalente.
const CHROMATIC_RUN = [
  NOTE.C6,
  NOTE.B5,
  NOTE.AS5,
  NOTE.A5,
  NOTE.GS5,
  NOTE.G5,
  NOTE.FS5,
  NOTE.F5,
  NOTE.E5,
  NOTE.F5,
  NOTE.FS5,
  NOTE.G5,
  NOTE.GS5,
  NOTE.A5,
  NOTE.AS5,
  NOTE.B5,
];

const MELODY = [...PHRASE_A, ...PHRASE_B, ...CHROMATIC_RUN];

const NOTE_DURATION_S = 0.135;
const NOTE_GAP_S = 0.02;

export function playPacmanIntro(): void {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const master = ctx.createGain();
  master.gain.value = 0.04; // 50% del volume originale (0.08)
  master.connect(ctx.destination);

  let t = ctx.currentTime + 0.02;
  for (const freq of MELODY) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(master);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.008);
    gain.gain.setValueAtTime(1, t + NOTE_DURATION_S - 0.02);
    gain.gain.linearRampToValueAtTime(0, t + NOTE_DURATION_S);

    osc.start(t);
    osc.stop(t + NOTE_DURATION_S);
    t += NOTE_DURATION_S + NOTE_GAP_S;
  }

  const totalMs = (t - ctx.currentTime + 0.1) * 1000;
  setTimeout(() => ctx.close(), totalMs);

  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}
