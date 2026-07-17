'use client';

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
      <span className="font-medium text-neutral-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="rounded-md border border-grid-border px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function ClientForm({ client, action }: ClientFormProps) {
  return (
    <form action={action} className="max-w-3xl space-y-8 p-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Anagrafica</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome / Denominazione *" name="name" defaultValue={client?.name} />
          <Field label="Referente" name="contactPerson" defaultValue={client?.contactPerson} />
          <Field label="Email" name="email" defaultValue={client?.email} type="email" />
          <Field label="Telefono" name="phone" defaultValue={client?.phone} />
          <Field label="Fax" name="fax" defaultValue={client?.fax} />
          <Field label="Codice interno" name="internalCode" defaultValue={client?.internalCode} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Indirizzo</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Indirizzo" name="address" defaultValue={client?.address} />
          <Field label="Indirizzo di spedizione" name="shippingAddress" defaultValue={client?.shippingAddress} />
          <Field label="Comune" name="city" defaultValue={client?.city} />
          <Field label="CAP" name="postalCode" defaultValue={client?.postalCode} />
          <Field label="Provincia" name="province" defaultValue={client?.province} />
          <Field label="Paese" name="country" defaultValue={client?.country} />
          <Field label="Note indirizzo" name="addressNotes" defaultValue={client?.addressNotes} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Fatturazione</h2>
        <div className="grid grid-cols-2 gap-4">
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
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Note</h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Note</span>
          <textarea
            name="notes"
            defaultValue={client?.notes}
            rows={4}
            className="rounded-md border border-grid-border px-3 py-2 text-sm"
          />
        </label>
      </section>

      <div className="flex gap-3">
        <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Salva
        </button>
      </div>
    </form>
  );
}
