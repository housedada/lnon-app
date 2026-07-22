'use client';

import { Save, Briefcase, Calendar, Euro, User } from 'lucide-react';
import type { Job, JobStatus } from '@/lib/types';

interface JobFormProps {
  job?: Job;
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string }[];
  action: (formData: FormData) => void;
  secondaryAction?: React.ReactNode;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft', label: 'Bozza' },
  { value: 'pending_approval', label: 'In attesa di approvazione' },
  { value: 'approved', label: 'Approvato' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'completed', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
];

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  icon: Icon,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  icon?: typeof Briefcase;
}) {
  return (
    <div className="field-wrap">
      <input
        type={type}
        name={name}
        id={name}
        defaultValue={defaultValue ?? ''}
        placeholder=" "
        step={type === 'number' ? '0.01' : undefined}
        className={`field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent ${
          Icon ? 'pr-9' : ''
        }`}
      />
      <label htmlFor={name} className="field-floating-label">
        {label}
      </label>
      {Icon && (
        <Icon
          size={15}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function toDateInputValue(date?: Date): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export default function JobForm({ job, clientOptions, contractOptions, productOptions, userOptions, action, secondaryAction }: JobFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Lavoro</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Titolo *" name="title" defaultValue={job?.title} icon={Briefcase} />
          <div className="field-wrap">
            <select
              name="clientId"
              id="clientId"
              defaultValue={job?.clientId ?? ''}
              required
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              <option value="" disabled>
                Seleziona un cliente
              </option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label htmlFor="clientId" className="field-floating-label">
              Cliente *
            </label>
          </div>
          <div className="field-wrap">
            <select
              name="contractId"
              id="contractId"
              defaultValue={job?.contractId ?? ''}
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              <option value="">— Nessun contratto di origine —</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label htmlFor="contractId" className="field-floating-label">
              Contratto di origine
            </label>
          </div>
          <div className="field-wrap">
            <select
              name="status"
              id="status"
              defaultValue={job?.status ?? 'draft'}
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label htmlFor="status" className="field-floating-label">
              Stato
            </label>
          </div>
          <div className="field-wrap">
            <select
              name="assignedTo"
              id="assignedTo"
              defaultValue={job?.assignedTo ?? ''}
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              <option value="">— Non assegnato —</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <label htmlFor="assignedTo" className="field-floating-label">
              <User size={12} strokeWidth={1.75} className="mr-1 inline" aria-hidden="true" />
              Assegnato a
            </label>
          </div>
        </div>
        <div className="field-wrap">
          <textarea
            name="description"
            id="description"
            defaultValue={job?.description}
            rows={3}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-5 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="description" className="field-floating-label">
            Descrizione
          </label>
        </div>
      </section>

      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Budget e date</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Budget stimato" name="estimatedBudget" defaultValue={job?.estimatedBudget} type="number" icon={Euro} />
          <Field label="Budget reale" name="actualBudget" defaultValue={job?.actualBudget} type="number" icon={Euro} />
          <Field label="Data inizio" name="startDate" defaultValue={toDateInputValue(job?.startDate)} type="date" icon={Calendar} />
          <Field label="Data fine" name="endDate" defaultValue={toDateInputValue(job?.endDate)} type="date" icon={Calendar} />
        </div>
        <input type="hidden" name="currency" value={job?.currency ?? 'EUR'} />
      </section>

      <section className="card-shadow space-y-3 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Prodotti/servizi coinvolti</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {productOptions.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" name="productIds" value={p.id} defaultChecked={job?.productIds?.includes(p.id)} />
              {p.name}
            </label>
          ))}
          {productOptions.length === 0 && <p className="text-xs text-secondary">Nessun prodotto in catalogo.</p>}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button type="submit" className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
        {secondaryAction}
      </div>
    </form>
  );
}
