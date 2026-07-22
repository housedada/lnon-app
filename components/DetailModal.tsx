'use client';

import { createPortal } from 'react-dom';
import { X, Copy } from 'lucide-react';
import { notify } from '@/lib/notify';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

interface DetailModalProps {
  title: string;
  sections: DetailSection[];
  onClose: () => void;
}

function copyValue(value: string) {
  navigator.clipboard.writeText(value).then(() => notify('Copiato negli appunti.'));
}

export default function DetailModal({ title, sections, onClose }: DetailModalProps) {
  return createPortal(
    <div className="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        className="modal-panel card-shadow max-h-[85vh] w-[96%] max-w-[1280px] overflow-y-auto rounded-xl border border-grid-border bg-card-bg p-6"
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
          {sections.map((section, index) => (
            <div key={section.title} className={index > 0 ? 'border-t border-grid-border pt-6' : ''}>
              <h3 className="detail-label mb-2">{section.title}</h3>
              <div className="grid grid-cols-2 gap-[1px] overflow-hidden rounded-lg border border-grid-border bg-grid-border sm:grid-cols-3 lg:grid-cols-4">
                {section.fields.map((field) => (
                  <div key={field.label} className="bg-card-bg px-3 py-2">
                    <p className="detail-label">{field.label}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {field.copyable && typeof field.value === 'string' && field.value && (
                        <button
                          type="button"
                          onClick={() => copyValue(field.value as string)}
                          aria-label={`Copia ${field.label}`}
                          className="text-secondary transition hover:text-primary"
                        >
                          <Copy size={12} strokeWidth={1.75} />
                        </button>
                      )}
                      <p className="text-sm text-primary">{field.value ?? '—'}</p>
                    </div>
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
