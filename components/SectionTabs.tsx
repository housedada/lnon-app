'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function SectionTabs({
  tabs,
  storageKey,
}: {
  tabs: { key: string; label: string; href: string }[];
  storageKey?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!storageKey) return;
    // Solo sulla route "di ingresso" (il primo tab) verifichiamo se l'utente aveva
    // scelto un'altra sotto-sezione l'ultima volta, per riportarcelo lì.
    if (pathname !== tabs[0].href) return;
    const savedKey = localStorage.getItem(storageKey);
    const savedTab = tabs.find((t) => t.key === savedKey);
    if (savedTab && savedTab.href !== pathname) {
      router.replace(savedTab.href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-6 mt-6 flex items-center gap-1 border-b border-grid-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          onClick={() => storageKey && localStorage.setItem(storageKey, tab.key)}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            pathname === tab.href
              ? 'border-[var(--accent-to)] text-primary'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
