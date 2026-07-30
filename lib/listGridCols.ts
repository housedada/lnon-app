/**
 * Conta le colonne effettive di un gridTemplateColumns (espandendo i repeat(N, ...)),
 * rispettando le parentesi annidate (es. repeat(5, minmax(max-content, 1fr))).
 */
export function countGridColumns(template: string): number {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of template.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ' ' && depth === 0) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  let count = 0;
  for (const token of tokens) {
    const repeatMatch = token.match(/^repeat\((\d+),/);
    count += repeatMatch ? Number(repeatMatch[1]) : 1;
  }
  return count;
}

/**
 * Il max-width per colonna nelle liste (vedi .list-grid-capped in globals.css)
 * si attiva solo oltre le 7 colonne: con poche colonne conviene lasciarle
 * respirare, è il tavolo largo con tante colonne strette a doverle contenere.
 */
export function listGridCappedClass(template: string): string {
  return countGridColumns(template) > 7 ? 'list-grid-capped' : '';
}
