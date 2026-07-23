'use client';

import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useTaskBoardExpandStore } from '@/lib/store/taskBoardExpandStore';

export default function TaskBoardExpandToggle() {
  const expanded = useTaskBoardExpandStore((s) => s.expanded);
  const toggle = useTaskBoardExpandStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      title={expanded ? 'Comprimi tutto (progetti e task)' : 'Espandi tutto (progetti e task)'}
      aria-label={expanded ? 'Comprimi tutto' : 'Espandi tutto'}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-secondary transition hover:text-primary"
    >
      {expanded ? <ChevronsDownUp size={14} strokeWidth={1.75} aria-hidden="true" /> : <ChevronsUpDown size={14} strokeWidth={1.75} aria-hidden="true" />}
    </button>
  );
}
