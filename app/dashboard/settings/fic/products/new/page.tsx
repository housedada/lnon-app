import { Package } from 'lucide-react';
import ProductForm from '@/components/ProductForm';
import FormPageModal from '@/components/FormPageModal';
import { createProductAction } from '@/lib/actions/products';

export const metadata = { title: 'Nuovo Prodotto' };

export default function NewProductPage() {
  return (
    <FormPageModal
      title="Nuovo Prodotto"
      icon={<Package size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
      closeHref="/dashboard/settings/fic/products"
    >
      <ProductForm action={createProductAction} />
    </FormPageModal>
  );
}
