import { Lock } from 'lucide-react';

export default function MaskedAmount() {
  return (
    <span
      className="inline-flex items-center gap-1 text-secondary"
      title="Importo non visibile per il tuo ruolo"
    >
      <Lock size={11} strokeWidth={1.75} aria-hidden="true" />
      ***
    </span>
  );
}
