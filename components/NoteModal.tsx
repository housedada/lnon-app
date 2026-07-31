'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, StickyNote } from 'lucide-react';
import { notify } from '@/lib/notify';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';
import type { ProjectTask } from '@/lib/types';

const NOTE_MAX_LENGTH = 1000;

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

        <div className="flex min-h-0 flex-1 flex-col p-10">
          {editing ? (
            <textarea
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
              className="notebook-paper notebook-paper-lg field-input min-h-0 w-full flex-1 resize-none rounded-md px-5 py-3 text-base text-primary"
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="notebook-paper notebook-paper-lg min-h-0 flex-1 cursor-text overflow-y-auto whitespace-pre-wrap rounded-md px-5 py-3 text-base text-primary"
              title="Clicca per modificare"
            >
              {task.title || <span className="text-secondary/60 italic">Nota vuota — clicca per scrivere</span>}
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
