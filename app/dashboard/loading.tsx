import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 size={22} strokeWidth={1.75} className="animate-spin text-secondary" aria-label="Caricamento" />
    </div>
  );
}
