'use client';

import { useEffect, useState } from 'react';

type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme-preference';

function applyTheme(preference: ThemePreference) {
  if (preference === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', preference);
  }
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>('auto');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      setPreference(stored);
    }
  }, []);

  function choose(next: ThemePreference) {
    setPreference(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Giorno' },
    { value: 'dark', label: 'Notte' },
    { value: 'auto', label: 'Auto' },
  ];

  return (
    <div className="flex gap-1 rounded-md bg-neutral-800 p-1 text-xs">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          className={`flex-1 rounded px-2 py-1 transition ${
            preference === option.value
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
