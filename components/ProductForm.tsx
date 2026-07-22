'use client';

import { Save, Tag, Hash, Ruler, Euro, Percent, Layers } from 'lucide-react';
import type { Product } from '@/lib/types';

interface ProductFormProps {
  product?: Product;
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

export default function ProductForm({ product, action, secondaryAction }: ProductFormProps) {
  return (
    <form action={action} className="w-full space-y-6 p-6">
      <section className="card-shadow space-y-4 rounded-xl border border-grid-border bg-card-bg p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome *" name="name" defaultValue={product?.name} icon={Tag} />
          <Field label="Codice" name="code" defaultValue={product?.code} icon={Hash} />
          <Field label="Categoria" name="category" defaultValue={product?.category} icon={Layers} />
          <Field label="Unità di misura" name="measure" defaultValue={product?.measure} icon={Ruler} />
          <Field label="Prezzo netto" name="netPrice" defaultValue={product?.netPrice} type="number" icon={Euro} />
          <Field label="Prezzo lordo" name="grossPrice" defaultValue={product?.grossPrice} type="number" icon={Euro} />
          <Field label="Aliquota IVA predefinita" name="defaultVatRate" defaultValue={product?.defaultVatRate} type="number" icon={Percent} />
        </div>
        <div className="field-wrap">
          <textarea
            name="description"
            id="description"
            defaultValue={product?.description}
            rows={3}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-5 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="description" className="field-floating-label">
            Descrizione
          </label>
        </div>
        <div className="field-wrap">
          <textarea
            name="notes"
            id="notes"
            defaultValue={product?.notes}
            rows={3}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-5 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="notes" className="field-floating-label">
            Note
          </label>
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
