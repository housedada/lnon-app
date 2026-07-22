'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DetailSection {
  title: string;
  fields: { label: string; value: React.ReactNode }[];
}

interface DetailModalProps {
  title: string;
  sections: DetailSection[];
  onClose: () => void;
}

export default function DetailModal({ title, sections, onClose }: DetailModalProps) {
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="modal-panel card-shadow max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-grid-border bg-card-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="detail-modal-title" className="text-base font-semibold text-primary">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="text-secondary transition hover:text-primary">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="detail-label mb-2">{section.title}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <p className="detail-label">{field.label}</p>
                    <p className="mt-0.5 text-sm text-primary">{field.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
