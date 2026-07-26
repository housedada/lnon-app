'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SectionTabs({
  tabs,
  storageKey,
}: {
  tabs: { key: string; label: string; href: string }[];
  storageKey?: string;
}) {
  const pathname = usePathname();

  // Nessun redirect-al-mount qui: landing sulla route del primo tab è
  // indistinguibile da "nessuna scelta esplicita", quindi un redirect
  // basato solo sul pathname scattava anche cliccando proprio quel tab.
  // Il "ricorda l'ultima sotto-sezione" vive ora nella Sidebar (che non si
  // smonta mai passando da una sezione all'altra); qui restiamo a scrivere
  // la scelta in localStorage per tenerla sincronizzata.

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
