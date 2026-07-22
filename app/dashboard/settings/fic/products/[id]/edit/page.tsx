import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import ProductForm from '@/components/ProductForm';
import DangerActionModal from '@/components/DangerActionModal';
import { getProductById } from '@/lib/db';
import { updateProductAction, deleteProductAction } from '@/lib/actions/products';
import { canDeleteResource } from '@/lib/permissions';

export const metadata = { title: 'Modifica Prodotto' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  const session = await auth();
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';

  if (!product) {
    notFound();
  }

  const boundAction = updateProductAction.bind(null, id);
  const canDelete = canDeleteResource(role, '', '', 'products');

  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Modifica Prodotto</h1>
      <ProductForm
        product={product}
        action={boundAction}
        secondaryAction={
          canDelete && (
            <DangerActionModal
              action={deleteProductAction.bind(null, product.id)}
              resourceLabel={`il prodotto “${product.name}”`}
              successMessage="Prodotto eliminato."
            />
          )
        }
      />
    </div>
  );
}
