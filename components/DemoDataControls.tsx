'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FlaskConical } from 'lucide-react';

export default function DemoDataControls() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const demoOn = searchParams.get('demo') === '1';

  const params = new URLSearchParams(searchParams.toString());
  if (demoOn) params.delete('demo');
  else params.set('demo', '1');
  const qs = params.toString();
  const toggleHref = qs ? `${pathname}?${qs}` : pathname;

  return (
    <Link
      href={toggleHref}
      title="Mostra/nascondi utenti e progetti demo (solo per test UI)"
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        demoOn ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      <FlaskConical size={13} strokeWidth={1.75} aria-hidden="true" />
      Demo
    </Link>
  );
}
