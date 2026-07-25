'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectTaskStatusAction } from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import type { HourlyWorkEntry } from '@/lib/types';

function formatDate(value?: Date): string {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

export default function HourlyWorkEntryRow({ entry }: { entry: HourlyWorkEntry }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const completed = entry.status === 'completata';

  function toggle() {
    if (!entry.projectTaskId) return;
    startTransition(async () => {
      const res = await updateProjectTaskStatusAction(entry.projectTaskId!, completed ? 'todo' : 'completed');
      if (!res.success) notify(res.message);
      else router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-7 items-center gap-3 border-b border-grid-border px-4 py-3 text-sm text-primary">
      <span>{entry.platformReference ?? '—'}</span>
      <span>{entry.description}</span>
      <span>{formatDate(entry.taskCreatedAt)}</span>
      <span>{formatDate(entry.taskCompletedAt)}</span>
      <span>{entry.hours}</span>
      <span className="font-medium">€ {entry.amount.toFixed(2)}</span>
      <label className="flex items-center gap-1.5 text-xs text-secondary">
        <input type="checkbox" checked={completed} disabled={isPending || !entry.projectTaskId} onChange={toggle} className="cursor-pointer" />
        {completed ? 'Completata' : 'Assegnata'}
      </label>
    </div>
  );
}
