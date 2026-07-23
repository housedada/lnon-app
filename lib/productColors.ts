import { USER_TAG_COLORS } from '@/lib/types';

/**
 * Colore pastello deterministico per prodotto, assegnato progressivamente in
 * base alla posizione nell'elenco prodotti (stesso ordine di getAllProductNames,
 * per nome): lo stesso prodotto ha sempre lo stesso colore nel tempo.
 */
export function buildProductColorMap(productOptions: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  productOptions.forEach((p, i) => {
    map.set(p.id, USER_TAG_COLORS[i % USER_TAG_COLORS.length]);
  });
  return map;
}
