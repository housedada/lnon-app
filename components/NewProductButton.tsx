'use client';

import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import FormPageModal from '@/components/FormPageModal';
import ProductForm from '@/components/ProductForm';
import { createProductAction } from '@/lib/actions/products';

export default function NewProductButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuovo Prodotto
      </button>
      {open && (
        <FormPageModal
          title="Nuovo Prodotto"
          icon={<Package size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setOpen(false)}
        >
          <ProductForm action={createProductAction} />
        </FormPageModal>
      )}
    </>
  );
}
