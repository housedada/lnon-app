import { notFound } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { getProductById } from '@/lib/db';
import { updateProductAction } from '@/lib/actions/products';

export const metadata = { title: 'Modifica Prodotto' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const boundAction = updateProductAction.bind(null, id);

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Modifica Prodotto</h1>
      <ProductForm product={product} action={boundAction} />
    </div>
  );
}
