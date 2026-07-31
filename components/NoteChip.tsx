'use client';

import { useState, type CSSProperties } from 'react';
import { GripVertical, Trash2, Maximize2 } from 'lucide-react';
import AssigneeFloatingMenu from '@/components/AssigneeFloatingMenu';
import NoteModal from '@/components/NoteModal';
import type { ProjectTask } from '@/lib/types';

const NOTE_MAX_LENGTH = 1000;

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
      className={`group/note notebook-paper flex flex-col rounded-lg text-[13px] transition-opacity duration-150 ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      <div className="flex shrink-0 items-center justify-between px-1.5 pt-1">
        <span
          ref={dragHandleRef}
          {...dragHandleProps}
          className="flex h-4 w-4 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          aria-label="Trascina per riordinare"
        >
          <GripVertical size={12} strokeWidth={1.75} className="text-secondary opacity-30 transition-opacity group-hover/note:opacity-70" aria-hidden="true" />
        </span>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Elimina nota"
          title="Elimina nota"
          className="flex h-4 w-4 shrink-0 items-center justify-center text-secondary opacity-0 transition-opacity group-hover/note:opacity-70 hover:!opacity-100"
        >
          <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
        </button>
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
          className="w-full flex-1 resize-none bg-transparent px-2.5 py-1 text-primary outline-none"
          style={{ minHeight: 60 }}
        />
      ) : (
        <div
          onClick={handleBodyClick}
          className="line-clamp-3 flex-1 cursor-text overflow-hidden px-2.5 py-1 text-primary"
          style={{ minHeight: 60 }}
        >
          {task.title || <span className="text-secondary/60 italic">Nota vuota — clicca per scrivere</span>}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between px-1.5 pb-1">
        <div className="flex items-center gap-1">
          {task.assignedToUsers.length > 0 && (
            <div className="flex -space-x-1.5">
              {task.assignedToUsers.slice(0, 3).map((u) => (
                <span
                  key={u.id}
                  title={u.name}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-card-bg text-[8px] font-semibold text-neutral-800"
                  style={{ background: u.color ?? 'var(--color-grid-border)' }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </span>
              ))}
              {task.assignedToUsers.length > 3 && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-card-bg bg-grid-border text-[8px] font-semibold text-secondary">
                  +{task.assignedToUsers.length - 3}
                </span>
              )}
            </div>
          )}
          <AssigneeFloatingMenu userOptions={userOptions} assignedIds={task.assignedToIds} onToggle={onToggleAssignee} />
        </div>

        <button
          type="button"
          onClick={openExpanded}
          aria-label="Espandi nota"
          title="Espandi nota"
          className="flex h-5 w-5 items-center justify-center rounded text-secondary opacity-60 transition-opacity hover:!opacity-100 group-hover/note:opacity-90"
        >
          <Maximize2 size={11} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

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
