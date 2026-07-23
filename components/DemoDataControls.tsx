'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { FlaskConical, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { generateDemoDataAction, clearDemoDataAction } from '@/lib/actions/demoData';
import { notify } from '@/lib/notify';

export default function DemoDataControls() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const demoOn = searchParams.get('demo') === '1';

  const params = new URLSearchParams(searchParams.toString());
  if (demoOn) params.delete('demo');
  else params.set('demo', '1');
  const qs = params.toString();
  const toggleHref = qs ? `${pathname}?${qs}` : pathname;

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateDemoDataAction();
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  function handleClear() {
    startTransition(async () => {
      const res = await clearDemoDataAction();
      notify(res.message);
      if (res.success) router.refresh();
    });
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      <Link
        href={toggleHref}
        title="Mostra/nascondi dati demo"
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
          demoOn ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
        }`}
      >
        <FlaskConical size={13} strokeWidth={1.75} aria-hidden="true" />
        Demo
      </Link>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        title="Genera dati demo"
        aria-label="Genera dati demo"
        className="rounded-md p-1.5 text-secondary transition hover:text-primary disabled:opacity-60"
      >
        {isPending ? <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={handleClear}
        disabled={isPending}
        title="Svuota dati demo"
        aria-label="Svuota dati demo"
        className="rounded-md p-1.5 text-secondary transition hover:text-red-600 disabled:opacity-60"
      >
        <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
