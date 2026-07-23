'use client';

import { ListTodo } from 'lucide-react';
import { notify } from '@/lib/notify';

export default function CreateTaskButton() {
  return (
    <button
      type="button"
      onClick={() => notify('Task e sotto task: presto disponibili.')}
      aria-label="Crea task (presto disponibile)"
      title="Crea task (presto disponibile)"
      className="text-secondary/60 transition hover:text-secondary"
    >
      <ListTodo size={15} strokeWidth={1.75} />
    </button>
  );
}
