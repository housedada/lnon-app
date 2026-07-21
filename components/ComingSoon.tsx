import { Hammer } from 'lucide-react';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-grid-border text-secondary">
          <Hammer size={20} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-primary">Sezione in arrivo</p>
        <p className="max-w-sm text-sm text-secondary">
          Questa parte del gestionale è in fase di sviluppo e sarà presto disponibile.
        </p>
      </div>
    </div>
  );
}
