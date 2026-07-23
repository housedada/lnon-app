'use client';

import { useState, useTransition } from 'react';
import { updateProjectShareAction } from '@/lib/actions/projects';
import { notify } from '@/lib/notify';

export default function ProjectShareBadge({ projectId, share, textClass }: { projectId: string; share: number; textClass: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(share));
  const [isPending, startTransition] = useTransition();

  function commit() {
    setEditing(false);
    const num = Number(value);
    if (!Number.isFinite(num) || num === share) {
      setValue(String(share));
      return;
    }
    startTransition(async () => {
      const res = await updateProjectShareAction(projectId, num);
      notify(res.message);
    });
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setValue(String(share));
            setEditing(false);
          }
        }}
        className="w-10 shrink-0 rounded border border-grid-border bg-card-bg px-1 text-[10px] text-primary"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Clicca per modificare la quota % del budget"
      disabled={isPending}
      className={`shrink-0 text-[10px] font-medium transition disabled:opacity-50 ${textClass}`}
    >
      {share}%
    </button>
  );
}
