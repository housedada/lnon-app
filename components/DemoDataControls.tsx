'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FlaskConical } from 'lucide-react';

const STORAGE_KEY = 'lnon-demo-data-active';

export default function DemoDataControls() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const demoOn = searchParams.get('demo') === '1';

  useEffect(() => {
    // Ripristina lo stato demo salvato ogni volta che si atterra sulla pagina
    // senza il param esplicito (cambio tab, navigazione dal resto della piattaforma).
    if (searchParams.get('demo') !== null) return;
    if (localStorage.getItem(STORAGE_KEY) !== '1') return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('demo', '1');
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = new URLSearchParams(searchParams.toString());
  if (demoOn) params.delete('demo');
  else params.set('demo', '1');
  const qs = params.toString();
  const toggleHref = qs ? `${pathname}?${qs}` : pathname;

  return (
    <Link
      href={toggleHref}
      onClick={() => localStorage.setItem(STORAGE_KEY, demoOn ? '0' : '1')}
      title="Mostra/nascondi utenti e progetti demo (solo per test UI)"
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        demoOn ? 'demo-data-active text-amber-900' : 'text-secondary hover:text-primary'
      }`}
    >
      <FlaskConical size={13} strokeWidth={1.75} aria-hidden="true" />
      Demo
    </Link>
  );
}
