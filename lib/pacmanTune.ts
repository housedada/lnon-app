// Motivetto di apertura di Pac-Man, sintetizzato via Web Audio API (nessun
// file audio/MIDI necessario). Trascrizione semplificata delle due frasi
// dell'intro, note in Hz, tonalità abbassata di un'ottava.
const PITCH_SHIFT = 0.5; // un'ottava sotto

const NOTE = {
  B4: 493.88 * PITCH_SHIFT,
  C5: 523.25 * PITCH_SHIFT,
  DS5: 622.25 * PITCH_SHIFT,
  E5: 659.25 * PITCH_SHIFT,
  FS5: 739.99 * PITCH_SHIFT,
  G5: 783.99 * PITCH_SHIFT,
  B5: 987.77 * PITCH_SHIFT,
  C6: 1046.5 * PITCH_SHIFT,
} as const;

const PHRASE = [
  NOTE.B4,
  NOTE.B5,
  NOTE.FS5,
  NOTE.DS5,
  NOTE.B5,
  NOTE.FS5,
  NOTE.DS5,
  NOTE.C5,
  NOTE.C6,
  NOTE.G5,
  NOTE.E5,
  NOTE.C6,
  NOTE.G5,
  NOTE.E5,
];

const NOTE_DURATION_S = 0.115;
const NOTE_GAP_S = 0.016;

export function playPacmanIntro(): void {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const master = ctx.createGain();
  master.gain.value = 0.0128; // 16% del volume di riferimento (0.08)
  master.connect(ctx.destination);

  let t = ctx.currentTime + 0.02;
  for (const freq of PHRASE) {
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
