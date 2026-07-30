'use client';

import { Save, Briefcase, Calendar, Euro } from 'lucide-react';
import type { Job, JobStatus } from '@/lib/types';
import AssignedToPicker from '@/components/AssignedToPicker';
import ProductTagPicker from '@/components/ProductTagPicker';
import EntityPickerField from '@/components/EntityPickerField';

interface JobFormProps {
  job?: Job;
  defaultClientId?: string;
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  action: (formData: FormData) => void;
  secondaryAction?: React.ReactNode;
}

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'preventivato', label: 'Preventivato' },
  { value: 'pre_approvato', label: 'Pre-approvato' },
  { value: 'in_corso', label: 'In corso' },
  { value: 'completato', label: 'Completato' },
  { value: 'fatturato', label: 'Fatturato' },
  { value: 'annullato', label: 'Annullato' },
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

export default function JobForm({
  job,
  defaultClientId,
  clientOptions,
  contractOptions,
  productOptions,
  userOptions,
  action,
  secondaryAction,
}: JobFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Lavoro</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Titolo *" name="title" defaultValue={job?.title} icon={Briefcase} />
          <EntityPickerField
            name="clientId"
            label="Cliente *"
            placeholder="Seleziona un cliente"
            options={clientOptions.map((c) => ({ id: c.id, label: c.name }))}
            defaultValue={job?.clientId ?? defaultClientId}
          />
          <EntityPickerField
            name="contractIds"
            label="Contratti collegati"
            placeholder="Cerca contratto..."
            multiple
            options={contractOptions}
            defaultValues={job?.contractIds}
          />
          <div className="field-wrap">
            <select
              name="status"
              id="status"
              defaultValue={job?.status ?? 'preventivato'}
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
        </div>
        <div className="mt-4">
          <AssignedToPicker userOptions={userOptions} defaultValue={job?.assignedTo ?? ''} />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Budget stimato" name="estimatedBudget" defaultValue={job?.estimatedBudget} type="number" icon={Euro} />
          <Field label="Spese fornitori" name="supplierCost" defaultValue={job?.supplierCost} type="number" icon={Euro} />
          {job && (
            <div className="field-wrap flex flex-col justify-center px-3 pb-2 pt-4">
              <span className="mb-1 text-xs text-secondary">Budget reale</span>
              <span className="text-sm text-primary">
                {(job.actualBudget ?? 0).toLocaleString('it-IT', { style: 'currency', currency: job.currency ?? 'EUR' })}
              </span>
            </div>
          )}
          <Field label="Data inizio" name="startDate" defaultValue={toDateInputValue(job?.startDate)} type="date" icon={Calendar} />
          <Field label="Data fine" name="endDate" defaultValue={toDateInputValue(job?.endDate)} type="date" icon={Calendar} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field
            label="Anno di competenza *"
            name="fiscalYear"
            defaultValue={job?.fiscalYear ?? new Date().getFullYear()}
            type="number"
          />
          <Field label="Numero fattura" name="invoiceNumber" defaultValue={job?.invoiceNumber} />
        </div>
        <input type="hidden" name="currency" value={job?.currency ?? 'EUR'} />
      </section>

      <section className="card-shadow space-y-3 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Prodotti/servizi coinvolti</h2>
        <ProductTagPicker productOptions={productOptions} defaultSelected={job?.productIds} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {secondaryAction}
          {!job && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                name="createProject"
                value="1"
                defaultChecked
                className="h-4 w-4 rounded border-grid-border accent-[var(--color-accent)]"
              />
              Crea anche un progetto collegato e aggiungi subito i task
            </label>
          )}
        </div>
        <button type="submit" className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
      </div>
    </form>
  );
}
