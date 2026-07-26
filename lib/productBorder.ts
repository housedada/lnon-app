import type { CSSProperties } from 'react';

// PRNG deterministico (stesso pattern di lib/demoData.ts): lo shuffle dei
// colori sui 4 lati della card resta stabile tra un render e l'altro per lo
// stesso progetto, invece di "sfarfallare" ad ogni re-render con Math.random.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  function rand() {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return h / 4294967296;
  }
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Colora i 4 lati del bordo di una card con i colori dei prodotti associati
 * al lavoro collegato: un prodotto solo -> bordo uniforme, più prodotti ->
 * assegnazione random (ma stabile per progetto) ai 4 lati, fino a un massimo
 * di 4 colori (uno per lato).
 */
export function productBorderStyle(colors: string[] | undefined, seed: string): CSSProperties | undefined {
  if (!colors || colors.length === 0) return undefined;
  const picked = colors.length > 1 ? seededShuffle(colors, seed).slice(0, 4) : colors;
  return {
    borderStyle: 'solid',
    borderTopColor: picked[0 % picked.length],
    borderRightColor: picked[1 % picked.length],
    borderBottomColor: picked[2 % picked.length],
    borderLeftColor: picked[3 % picked.length],
  };
}
