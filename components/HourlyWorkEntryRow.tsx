'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectTaskStatusAction } from '@/lib/actions/projectTasks';
import { notify } from '@/lib/notify';
import { HOURLY_ENTRY_GRID_TEMPLATE } from '@/lib/hourlyBilling';
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
    <div
      className={`grid min-w-fit items-center gap-4 border-b border-grid-border px-4 py-3 text-sm text-primary ${entry.locked ? 'opacity-50' : ''}`}
      style={{ gridTemplateColumns: HOURLY_ENTRY_GRID_TEMPLATE }}
    >
      <span>{entry.description}</span>
      <span className="whitespace-nowrap text-secondary">{entry.platformReference ?? '—'}</span>
      <span className="whitespace-nowrap">{formatDate(entry.taskCreatedAt)}</span>
      <span className="whitespace-nowrap">{formatDate(entry.taskCompletedAt)}</span>
      <span className="whitespace-nowrap">{entry.hours}</span>
      <span className="whitespace-nowrap font-medium">€ {entry.amount.toFixed(2)}</span>
      <label
        className={`flex items-center gap-1.5 whitespace-nowrap text-xs text-secondary ${entry.locked ? 'cursor-not-allowed' : ''}`}
        title={entry.locked ? 'Lavorazione congelata: ha messo il contratto in riposo' : undefined}
      >
        <input
          type="checkbox"
          checked={completed}
          disabled={isPending || !entry.projectTaskId || entry.locked}
          onChange={toggle}
          className={entry.locked ? 'cursor-not-allowed' : 'cursor-pointer'}
        />
        {completed ? 'Completata' : 'Assegnata'}
      </label>
    </div>
  );
}
