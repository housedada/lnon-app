import ProductForm from '@/components/ProductForm';
import { createProductAction } from '@/lib/actions/products';

export const metadata = { title: 'Nuovo Prodotto' };

export default function NewProductPage() {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Nuovo Prodotto</h1>
      <ProductForm action={createProductAction} />
    </div>
  );
}
