'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import ParticleCanvasHeader from '@/components/ParticleCanvasHeader';

export default function FormPageModal({
  title,
  icon,
  closeHref,
  onClose,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  /** Usato solo come fallback quando la modale è una pagina a sé (accesso diretto via URL). */
  closeHref?: string;
  /** Chiusura in-place (nessuna navigazione), preferita quando la modale è aperta da uno stato client su una lista già montata. */
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleClose() {
    if (onClose) {
      onClose();
    } else if (closeHref) {
      router.push(closeHref);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel card-shadow flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card-bg"
      >
        <div className="modal-header-gradient relative flex shrink-0 items-center justify-between gap-3 overflow-hidden px-8 py-5">
          <ParticleCanvasHeader />
          <h2 className="relative z-10 flex items-center gap-2 text-sm font-semibold text-white">
            {icon}
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Chiudi"
            className="relative z-10 text-white/70 transition hover:text-white"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
