'use client';

import { Save } from 'lucide-react';
import type { Client } from '@/lib/types';

interface ClientFormProps {
  client?: Client;
  action: (formData: FormData) => void;
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="field-label text-primary">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="rounded-md border border-grid-border px-3 py-2 text-sm"
      />
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow space-y-4 rounded-lg border border-grid-border bg-card-bg p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">{title}</h2>
      {children}
    </section>
  );
}

export default function ClientForm({ client, action }: ClientFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <Card title="Anagrafica">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome / Denominazione *" name="name" defaultValue={client?.name} />
          <Field label="Referente" name="contactPerson" defaultValue={client?.contactPerson} />
          <Field label="Email" name="email" defaultValue={client?.email} type="email" />
          <Field label="Telefono" name="phone" defaultValue={client?.phone} />
          <Field label="Fax" name="fax" defaultValue={client?.fax} />
          <Field label="Codice interno" name="internalCode" defaultValue={client?.internalCode} />
        </div>
      </Card>

      <Card title="Indirizzo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Indirizzo" name="address" defaultValue={client?.address} />
          <Field label="Indirizzo di spedizione" name="shippingAddress" defaultValue={client?.shippingAddress} />
          <Field label="Comune" name="city" defaultValue={client?.city} />
          <Field label="CAP" name="postalCode" defaultValue={client?.postalCode} />
          <Field label="Provincia" name="province" defaultValue={client?.province} />
          <Field label="Paese" name="country" defaultValue={client?.country} />
          <Field label="Note indirizzo" name="addressNotes" defaultValue={client?.addressNotes} />
        </div>
      </Card>

      <Card title="Fatturazione">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="P.IVA" name="taxId" defaultValue={client?.taxId} />
          <Field label="Codice Fiscale" name="fiscalCode" defaultValue={client?.fiscalCode} />
          <Field label="PEC" name="pecEmail" defaultValue={client?.pecEmail} type="email" />
          <Field label="IBAN" name="iban" defaultValue={client?.iban} />
          <Field label="Codice SDI" name="sdiCode" defaultValue={client?.sdiCode} />
          <Field label="Aliquota IVA predefinita" name="defaultVatRate" defaultValue={client?.defaultVatRate} type="number" />
          <Field label="Termini di pagamento" name="paymentTerms" defaultValue={client?.paymentTerms} />
          <Field label="Metodo di pagamento predefinito" name="defaultPaymentMethod" defaultValue={client?.defaultPaymentMethod} />
          <Field label="Sconto predefinito (%)" name="defaultDiscount" defaultValue={client?.defaultDiscount} type="number" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="letterOfIntentEnabled" defaultChecked={client?.letterOfIntentEnabled} />
          Lettera d&apos;intento abilitata
        </label>
      </Card>

      <Card title="Note">
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label text-primary">Note</span>
          <textarea
            name="notes"
            defaultValue={client?.notes}
            rows={4}
            className="rounded-md border border-grid-border px-3 py-2 text-sm"
          />
        </label>
      </Card>

      <div className="flex gap-3">
        <button type="submit" className="flex items-center gap-1.5 rounded-md bg-button-bg px-4 py-2 text-sm font-medium text-button-text hover:bg-button-bg-hover">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
      </div>
    </form>
  );
}
