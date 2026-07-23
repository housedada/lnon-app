'use client';

import { useState } from 'react';
import { User } from 'lucide-react';

export default function AssignedToPicker({
  name = 'assignedTo',
  userOptions,
  defaultValue = '',
}: {
  name?: string;
  userOptions: { id: string; name: string; color?: string }[];
  defaultValue?: string;
}) {
  const [assignedTo, setAssignedTo] = useState(defaultValue);

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-secondary">
        <User size={12} strokeWidth={1.75} aria-hidden="true" />
        Assegnato a
      </p>
      <input type="hidden" name={name} value={assignedTo} />
      <div className="flex flex-wrap gap-2 rounded-lg border border-grid-border p-3">
        <button
          type="button"
          onClick={() => setAssignedTo('')}
          aria-pressed={assignedTo === ''}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            assignedTo === '' ? 'border-transparent bg-grid-header-bg text-primary' : 'border-grid-border text-secondary hover:text-primary'
          }`}
        >
          Non assegnato
        </button>
        {userOptions.map((u) => {
          const selected = assignedTo === u.id;
          const color = u.color ?? '#e5e5e5';
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setAssignedTo(u.id)}
              aria-pressed={selected}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 transition"
              style={{
                background: color,
                outline: selected ? '2px solid var(--accent-to)' : 'none',
                outlineOffset: '1px',
              }}
            >
              {u.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
