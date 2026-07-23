'use client';

import { useState } from 'react';
import { USER_TAG_COLORS } from '@/lib/types';

export default function ProductTagPicker({
  productOptions,
  defaultSelected = [],
}: {
  productOptions: { id: string; name: string }[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div>
      {selected.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}
      <div className="flex flex-wrap gap-2">
        {productOptions.map((p, i) => {
          const active = selected.includes(p.id);
          const color = USER_TAG_COLORS[i % USER_TAG_COLORS.length];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              aria-pressed={active}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 transition"
              style={{
                background: color,
                opacity: active ? 1 : 0.4,
                outline: active ? '2px solid var(--accent-to)' : 'none',
                outlineOffset: '1px',
              }}
            >
              {p.name}
            </button>
          );
        })}
        {productOptions.length === 0 && <p className="text-xs text-secondary">Nessun prodotto in catalogo.</p>}
      </div>
    </div>
  );
}
