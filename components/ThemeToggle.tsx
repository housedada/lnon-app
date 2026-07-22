'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react';

type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme-preference';
const ORDER: ThemePreference[] = ['light', 'dark', 'auto'];
const ICONS: Record<ThemePreference, LucideIcon> = { light: Sun, dark: Moon, auto: Monitor };
const LABELS: Record<ThemePreference, string> = { light: 'Giorno', dark: 'Notte', auto: 'Automatico' };

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

  function cycle() {
    const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
    setPreference(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${LABELS[preference]} (clicca per cambiare)`}
      title={`Tema: ${LABELS[preference]}`}
      className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
