import type { ReactNode } from 'react';

/**
 * Markdown-lite per le note: solo **bold**, *italic*, ~~strike~~, righe
 * "# Titolo", "- elenco puntato", "1. elenco numerato". Volutamente non un
 * parser markdown completo — copre solo i pulsanti della toolbar di NoteModal,
 * niente link/immagini/nesting.
 */
function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-${i}`}>{match[2]}</strong>);
    else if (match[4] !== undefined) nodes.push(<em key={`${keyPrefix}-${i}`}>{match[4]}</em>);
    else if (match[6] !== undefined) nodes.push(<s key={`${keyPrefix}-${i}`}>{match[6]}</s>);
    lastIndex = pattern.lastIndex;
    i++;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

export function renderNoteMarkup(text: string): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  function flushList() {
    if (!listBuffer) return;
    const ListTag = listBuffer.ordered ? 'ol' : 'ul';
    blocks.push(
      <ListTag key={key++} className={`leading-5 ${listBuffer.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  }

  for (const rawLine of lines) {
    const bulletMatch = rawLine.match(/^-\s(.*)$/);
    const numberedMatch = rawLine.match(/^\d+\.\s(.*)$/);
    const headingMatch = rawLine.match(/^#\s(.*)$/);

    if (bulletMatch) {
      if (!listBuffer || listBuffer.ordered) {
        flushList();
        listBuffer = { ordered: false, items: [] };
      }
      listBuffer.items.push(bulletMatch[1]);
      continue;
    }
    if (numberedMatch) {
      if (!listBuffer || !listBuffer.ordered) {
        flushList();
        listBuffer = { ordered: true, items: [] };
      }
      listBuffer.items.push(numberedMatch[1]);
      continue;
    }
    flushList();

    if (headingMatch) {
      blocks.push(
        <p key={key++} className="text-lg font-bold">
          {renderInline(headingMatch[1], `h-${key}`)}
        </p>
      );
      continue;
    }
    if (rawLine === '') {
      blocks.push(<br key={key++} />);
      continue;
    }
    blocks.push(<p key={key++}>{renderInline(rawLine, `p-${key}`)}</p>);
  }
  flushList();

  return blocks;
}
