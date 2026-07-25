'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SectionTabs({ tabs }: { tabs: { key: string; label: string; href: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="mx-6 mt-6 flex items-center gap-1 border-b border-grid-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
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
