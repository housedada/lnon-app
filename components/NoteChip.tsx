'use client';

import { useState, type CSSProperties } from 'react';
import { GripVertical, Trash2, Maximize2 } from 'lucide-react';
import AssigneeFloatingMenu from '@/components/AssigneeFloatingMenu';
import NoteModal from '@/components/NoteModal';
import type { ProjectTask } from '@/lib/types';

const NOTE_MAX_LENGTH = 1000;
const SIDE_PADDING = 24;

export default function NoteChip({
  task,
  userOptions,
  dragRef,
  dragStyle,
  dragHandleRef,
  dragHandleProps,
  isDragging,
  onSaveText,
  onToggleAssignee,
  onDelete,
}: {
  task: ProjectTask;
  userOptions: { id: string; name: string; color?: string }[];
  dragRef: (el: HTMLElement | null) => void;
  dragStyle: CSSProperties;
  dragHandleRef: (el: HTMLElement | null) => void;
  dragHandleProps: Record<string, unknown>;
  isDragging?: boolean;
  onSaveText: (text: string) => Promise<{ success: boolean; message: string }>;
  onToggleAssignee: (userId: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [expandedOnce, setExpandedOnce] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed !== task.title) onSaveText(trimmed);
  }

  function openExpanded(e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedOnce(true);
    setModalOpen(true);
  }

  function handleBodyClick() {
    if (editing) return;
    if (expandedOnce) {
      setModalOpen(true);
    } else {
      setDraft(task.title);
      setEditing(true);
    }
  }

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      className={`group/note notebook-paper relative rounded-lg text-[13px] transition-opacity duration-150 ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      <button
        type="button"
        onClick={onDelete}
        aria-label="Elimina nota"
        title="Elimina nota"
        className="absolute left-1.5 top-1.5 z-10 flex h-4 w-4 shrink-0 items-center justify-center text-secondary opacity-0 transition-opacity group-hover/note:opacity-70 hover:!opacity-100"
      >
        <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="absolute right-1.5 top-1.5 z-10">
        <AssigneeFloatingMenu userOptions={userOptions} assignedIds={task.assignedToIds} onToggle={onToggleAssignee} />
      </div>

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
          className="w-full resize-none bg-transparent py-1 text-primary outline-none"
          style={{ paddingLeft: SIDE_PADDING, paddingRight: SIDE_PADDING, minHeight: 76 }}
        />
      ) : (
        <div
          onClick={handleBodyClick}
          className="line-clamp-3 cursor-text overflow-hidden py-1 text-primary"
          style={{ paddingLeft: SIDE_PADDING, paddingRight: SIDE_PADDING, minHeight: 76 }}
        >
          {task.title || <span className="text-secondary/60 italic">Nota vuota — clicca per scrivere</span>}
        </div>
      )}

      <span
        ref={dragHandleRef}
        {...dragHandleProps}
        className="absolute bottom-1.5 left-1.5 z-10 flex h-4 w-4 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        aria-label="Trascina per riordinare"
      >
        <GripVertical size={12} strokeWidth={1.75} className="text-secondary opacity-30 transition-opacity group-hover/note:opacity-70" aria-hidden="true" />
      </span>

      <button
        type="button"
        onClick={openExpanded}
        aria-label="Espandi nota"
        title="Espandi nota"
        className="absolute bottom-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded text-secondary opacity-60 transition-opacity hover:!opacity-100 group-hover/note:opacity-90"
      >
        <Maximize2 size={11} strokeWidth={2} aria-hidden="true" />
      </button>

      {modalOpen && (
        <NoteModal
          task={task}
          onSave={async (text) => {
            const res = await onSaveText(text);
            return res;
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
