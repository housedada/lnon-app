'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Users2, User } from 'lucide-react';

const STORAGE_KEY = 'taskBoardView';

export default function TaskBoardModeTabs({ mode }: { mode: 'team' | 'personal' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Se l'URL specifica già una view esplicita, non sovrascriverla.
    if (searchParams.get('view')) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if ((saved === 'team' || saved === 'personal') && saved !== mode) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', saved);
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hrefFor(next: 'team' | 'personal') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', next);
    return `/dashboard/tasks?${params.toString()}`;
  }

  return (
    <>
      <Link
        href={hrefFor('team')}
        onClick={() => localStorage.setItem(STORAGE_KEY, 'team')}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'team' ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
        }`}
      >
        <Users2 size={14} strokeWidth={1.75} aria-hidden="true" />
        Team
      </Link>
      <Link
        href={hrefFor('personal')}
        onClick={() => localStorage.setItem(STORAGE_KEY, 'personal')}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'personal' ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
        }`}
      >
        <User size={14} strokeWidth={1.75} aria-hidden="true" />
        Personale
      </Link>
    </>
  );
}
