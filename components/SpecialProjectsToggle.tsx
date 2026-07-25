'use client';

import { Sparkles } from 'lucide-react';
import { useSpecialProjectsVisibilityStore } from '@/lib/store/specialProjectsVisibilityStore';

export default function SpecialProjectsToggle({ openCount }: { openCount: number }) {
  const visible = useSpecialProjectsVisibilityStore((s) => s.visible);
  const toggle = useSpecialProjectsVisibilityStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      title={visible ? 'Nascondi progetti speciali (conteggio orario)' : 'Mostra progetti speciali (conteggio orario)'}
      aria-label={visible ? 'Nascondi progetti speciali (conteggio orario)' : 'Mostra progetti speciali (conteggio orario)'}
      aria-pressed={visible}
      className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        visible ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
      {openCount > 0 && (
        <span className="task-count-badge absolute right-0 top-[-6px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {openCount}
        </span>
      )}
    </button>
  );
}
