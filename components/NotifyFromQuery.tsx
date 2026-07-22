'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { notify } from '@/lib/notify';

function NotifyFromQueryInner({ param, message }: { param: string; message: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!searchParams.has(param)) return;
    notify(message);
    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export default function NotifyFromQuery(props: { param: string; message: string }) {
  return (
    <Suspense fallback={null}>
      <NotifyFromQueryInner {...props} />
    </Suspense>
  );
}
