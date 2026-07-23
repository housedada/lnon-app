import { Loader2 } from 'lucide-react';

export default function ListPlaceholder() {
  return (
    <div className="mx-6 mt-6 flex h-64 items-center justify-center rounded-lg border border-grid-border bg-card-bg">
      <Loader2 size={26} strokeWidth={1.75} className="animate-spin text-secondary" aria-hidden="true" />
    </div>
  );
}
