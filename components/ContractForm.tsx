'use client';

import { Save, Tag, Globe, Calendar, Euro, Landmark, Server } from 'lucide-react';
import type { Contract } from '@/lib/types';

interface ContractFormProps {
  contract?: Contract;
  clientOptions: { id: string; name: string }[];
  action: (formData: FormData) => void;
  secondaryAction?: React.ReactNode;
}

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
  icon?: typeof Tag;
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

export default function ContractForm({ contract, clientOptions, action, secondaryAction }: ContractFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Cliente e sito</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome cliente (dal foglio) *" name="clientNameRaw" defaultValue={contract?.clientNameRaw} icon={Tag} />
          <div className="field-wrap">
            <select
              name="clientId"
              id="clientId"
              defaultValue={contract?.clientId ?? ''}
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              <option value="">— Non collegato —</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label htmlFor="clientId" className="field-floating-label">
              Cliente LNON collegato
            </label>
          </div>
          <Field label="Sito / dominio" name="site" defaultValue={contract?.site} icon={Globe} />
          <div className="field-wrap">
            <select
              name="status"
              id="status"
              defaultValue={contract?.status ?? 'da_definire'}
              className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
            >
              <option value="attivo">Attivo</option>
              <option value="da_definire">Da definire</option>
              <option value="disattivo">Disattivo</option>
            </select>
            <label htmlFor="status" className="field-floating-label">
              Stato
            </label>
          </div>
          <Field label="Mese di fatturazione" name="billingMonth" defaultValue={contract?.billingMonth} icon={Calendar} />
        </div>
      </section>

      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Servizi fatturati</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Manutenzione WP" name="maintenanceWpAmount" defaultValue={contract?.maintenanceWpAmount} type="number" icon={Euro} />
          <Field label="Hosting" name="hostingAmount" defaultValue={contract?.hostingAmount} type="number" icon={Euro} />
          <Field label="Analytics e GDPR" name="analyticsGdprAmount" defaultValue={contract?.analyticsGdprAmount} type="number" icon={Euro} />
          <Field label="Cookie (Complianz)" name="cookieAmount" defaultValue={contract?.cookieAmount} type="number" icon={Euro} />
          <Field label="Totale + IVA" name="totalAmount" defaultValue={contract?.totalAmount} type="number" icon={Euro} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Servizio (descrizione)" name="serviceDescription" defaultValue={contract?.serviceDescription} />
          <Field label="Pacchetto" name="package" defaultValue={contract?.package} />
        </div>
        <div className="field-wrap">
          <textarea
            name="notes"
            id="notes"
            defaultValue={contract?.notes}
            rows={3}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-5 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="notes" className="field-floating-label">
            Note
          </label>
        </div>
      </section>

      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">Fornitore esterno</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Provider" name="provider" defaultValue={contract?.provider} icon={Server} />
          <Field label="Piano / Servizio provider" name="providerPlan" defaultValue={contract?.providerPlan} icon={Server} />
          <Field label="Data scadenza" name="providerExpiryDate" defaultValue={toDateInputValue(contract?.providerExpiryDate)} type="date" icon={Calendar} />
          <Field label="Costo fornitore" name="providerCost" defaultValue={contract?.providerCost} type="number" icon={Landmark} />
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
