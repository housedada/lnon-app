'use client';

import { useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, StickyNote, Heading, Bold, Italic, Strikethrough, List, ListOrdered } from 'lucide-react';
import { notify } from '@/lib/notify';
import { renderNoteMarkup } from '@/lib/noteMarkup';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';
import type { ProjectTask } from '@/lib/types';

const NOTE_MAX_LENGTH = 1000;

function currentLineRange(value: string, selectionStart: number, selectionEnd: number) {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  let lineEnd = value.indexOf('\n', selectionEnd);
  if (lineEnd === -1) lineEnd = value.length;
  return { lineStart, lineEnd };
}

export default function NoteModal({
  task,
  onSave,
  onClose,
}: {
  task: ProjectTask;
  onSave: (text: string) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function close() {
    if (isPending) return;
    onClose();
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed === task.title.trim()) return;
    startTransition(async () => {
      const res = await onSave(trimmed);
      if (!res.success) notify(res.message);
    });
  }

  function setValueAndSelection(newValue: string, selStart: number, selEnd: number) {
    setDraft(newValue);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function applyWrap(marker: string) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || 'testo';
    const newValue = `${value.slice(0, selectionStart)}${marker}${selected}${marker}${value.slice(selectionEnd)}`;
    setValueAndSelection(newValue, selectionStart + marker.length, selectionStart + marker.length + selected.length);
  }

  function applyHeading() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const { lineStart, lineEnd } = currentLineRange(value, selectionStart, selectionEnd);
    const line = value.slice(lineStart, lineEnd);
    const newLine = line.startsWith('# ') ? line.slice(2) : `# ${line}`;
    const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
    setValueAndSelection(newValue, lineStart, lineStart + newLine.length);
  }

  function applyBulletList() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const { lineStart, lineEnd } = currentLineRange(value, selectionStart, selectionEnd);
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allBulleted = lines.every((l) => l.startsWith('- '));
    const newLines = allBulleted ? lines.map((l) => l.slice(2)) : lines.map((l) => `- ${l}`);
    const newBlock = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    setValueAndSelection(newValue, lineStart, lineStart + newBlock.length);
  }

  function applyNumberedList() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const { lineStart, lineEnd } = currentLineRange(value, selectionStart, selectionEnd);
    const lines = value.slice(lineStart, lineEnd).split('\n');
    const allNumbered = lines.every((l) => /^\d+\.\s/.test(l));
    const newLines = allNumbered ? lines.map((l) => l.replace(/^\d+\.\s/, '')) : lines.map((l, i) => `${i + 1}. ${l}`);
    const newBlock = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    setValueAndSelection(newValue, lineStart, lineStart + newBlock.length);
  }

  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel card-shadow flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-card-bg md:h-[80vh] md:max-h-[820px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-gradient relative flex shrink-0 items-center justify-between gap-3 overflow-hidden px-8 py-5">
          <ParticleCanvasHeader />
          <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
            <StickyNote size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />
            Nota
          </h2>
          <button type="button" onClick={close} disabled={isPending} aria-label="Chiudi" className="relative z-10 text-white/70 transition hover:text-white">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-8">
          {editing && (
            <div className="mb-2 flex shrink-0 items-center gap-1 rounded-md border border-grid-border bg-grid-header-bg p-1">
              <button type="button" onMouseDown={preventBlur} onClick={applyHeading} title="Titolo" aria-label="Titolo" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <Heading size={15} strokeWidth={1.75} />
              </button>
              <div className="mx-0.5 h-4 w-px bg-grid-border" />
              <button type="button" onMouseDown={preventBlur} onClick={() => applyWrap('**')} title="Grassetto" aria-label="Grassetto" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <Bold size={15} strokeWidth={1.75} />
              </button>
              <button type="button" onMouseDown={preventBlur} onClick={() => applyWrap('*')} title="Corsivo" aria-label="Corsivo" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <Italic size={15} strokeWidth={1.75} />
              </button>
              <button type="button" onMouseDown={preventBlur} onClick={() => applyWrap('~~')} title="Barrato" aria-label="Barrato" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <Strikethrough size={15} strokeWidth={1.75} />
              </button>
              <div className="mx-0.5 h-4 w-px bg-grid-border" />
              <button type="button" onMouseDown={preventBlur} onClick={applyBulletList} title="Elenco puntato" aria-label="Elenco puntato" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <List size={15} strokeWidth={1.75} />
              </button>
              <button type="button" onMouseDown={preventBlur} onClick={applyNumberedList} title="Elenco numerato" aria-label="Elenco numerato" className="rounded p-1.5 text-secondary transition hover:bg-row-hover hover:text-primary">
                <ListOrdered size={15} strokeWidth={1.75} />
              </button>
            </div>
          )}

          {editing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              maxLength={NOTE_MAX_LENGTH}
              className="notebook-paper notebook-paper-lg field-input min-h-0 w-full flex-1 resize-none rounded-md px-4 py-2 text-base text-primary"
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="notebook-paper notebook-paper-lg min-h-0 flex-1 cursor-text overflow-y-auto rounded-md px-4 py-2 text-base text-primary"
              title="Clicca per modificare"
            >
              {task.title ? renderNoteMarkup(task.title) : <span className="text-secondary/60 italic">Nota vuota — clicca per scrivere</span>}
            </div>
          )}
          <p className="mt-2 shrink-0 text-right text-[11px] text-secondary">
            {isPending ? <Loader2 size={11} strokeWidth={2} className="inline animate-spin" aria-hidden="true" /> : `${draft.length}/${NOTE_MAX_LENGTH}`}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
