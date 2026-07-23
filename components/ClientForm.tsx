'use client';

import {
  Save,
  Building2,
  User,
  Mail,
  Phone,
  Printer,
  Hash,
  MapPin,
  Truck,
  Landmark,
  Percent,
  Calendar,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Client } from '@/lib/types';

interface ClientFormProps {
  client?: Client;
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
  icon?: LucideIcon;
}) {
  return (
    <div className="field-wrap">
      <input
        type={type}
        name={name}
        id={name}
        defaultValue={defaultValue ?? ''}
        placeholder=" "
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">{title}</h2>
      {children}
    </section>
  );
}

export default function ClientForm({ client, action, secondaryAction }: ClientFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <Card title="Anagrafica">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome / Denominazione *" name="name" defaultValue={client?.name} icon={Building2} />
          <Field label="Referente" name="contactPerson" defaultValue={client?.contactPerson} icon={User} />
          <Field label="Email" name="email" defaultValue={client?.email} type="email" icon={Mail} />
          <Field label="Telefono" name="phone" defaultValue={client?.phone} icon={Phone} />
          <Field label="Fax" name="fax" defaultValue={client?.fax} icon={Printer} />
          <Field label="Codice interno" name="internalCode" defaultValue={client?.internalCode} icon={Hash} />
        </div>
      </Card>

      <Card title="Indirizzo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Indirizzo" name="address" defaultValue={client?.address} icon={MapPin} />
          <Field label="Indirizzo di spedizione" name="shippingAddress" defaultValue={client?.shippingAddress} icon={Truck} />
          <Field label="Comune" name="city" defaultValue={client?.city} icon={Building2} />
          <Field label="CAP" name="postalCode" defaultValue={client?.postalCode} icon={MapPin} />
          <Field label="Provincia" name="province" defaultValue={client?.province} icon={MapPin} />
          <Field label="Paese" name="country" defaultValue={client?.country} icon={MapPin} />
          <Field label="Note indirizzo" name="addressNotes" defaultValue={client?.addressNotes} />
        </div>
      </Card>

      <Card title="Fatturazione">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="P.IVA" name="taxId" defaultValue={client?.taxId} icon={Hash} />
          <Field label="Codice Fiscale" name="fiscalCode" defaultValue={client?.fiscalCode} icon={Hash} />
          <Field label="PEC" name="pecEmail" defaultValue={client?.pecEmail} type="email" icon={Mail} />
          <Field label="IBAN" name="iban" defaultValue={client?.iban} icon={Landmark} />
          <Field label="Codice SDI" name="sdiCode" defaultValue={client?.sdiCode} icon={Hash} />
          <Field label="Aliquota IVA predefinita" name="defaultVatRate" defaultValue={client?.defaultVatRate} type="number" icon={Percent} />
          <Field label="Termini di pagamento" name="paymentTerms" defaultValue={client?.paymentTerms} icon={Calendar} />
          <Field label="Metodo di pagamento predefinito" name="defaultPaymentMethod" defaultValue={client?.defaultPaymentMethod} icon={Wallet} />
          <Field label="Sconto predefinito (%)" name="defaultDiscount" defaultValue={client?.defaultDiscount} type="number" icon={Percent} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="letterOfIntentEnabled" defaultChecked={client?.letterOfIntentEnabled} />
          Lettera d&apos;intento abilitata
        </label>
      </Card>

      <Card title="Note">
        <div className="field-wrap">
          <textarea
            name="notes"
            id="notes"
            defaultValue={client?.notes}
            rows={4}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-5 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="notes" className="field-floating-label">
            Note
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>{secondaryAction}</div>
        <button type="submit" className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          Salva
        </button>
      </div>
    </form>
  );
}
