'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, RefreshCw, AlertTriangle, Trash2, Bug } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteProductFromListAction } from '@/lib/actions/products';
import { notify } from '@/lib/notify';
import type { Product } from '@/lib/types';

function ficBadge(status: 'not_synced' | 'synced' | 'orphaned') {
  if (status === 'synced') {
    return <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>;
  }
  if (status === 'orphaned') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
        Orfano
      </span>
    );
  }
  return <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>;
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

export default function ProductRow({
  product,
  color,
  ficConnection,
  canUpdate,
  canDelete,
  isSuperadmin,
}: {
  product: Product;
  color: string;
  ficConnection: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDeleteConfirm() {
    const res = await deleteProductFromListAction(product.id);
    notify(res.message);
    setDeleteOpen(false);
  }

  function handleInspect() {
    console.log('[Ispeziona] Prodotto', product);
    notify('Dati prodotto loggati in console (apri gli strumenti sviluppatore).');
  }

  return (
    <RowContextMenu
      className="group contents"
      menu={
        <>
          {canUpdate && (
            <Link href={`/dashboard/settings/products/${product.id}/edit`} className={MENU_ROW_CLASS}>
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
              Modifica prodotto
            </Link>
          )}
          {canDelete && (
            <button type="button" onClick={() => setDeleteOpen(true)} className={`${MENU_ROW_CLASS} text-red-600 hover:bg-red-600/5`}>
              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Elimina prodotto
            </button>
          )}
          {isSuperadmin && (
            <>
              <div className="my-1 border-t border-grid-border" />
              <button type="button" onClick={handleInspect} className={MENU_ROW_CLASS}>
                <Bug size={15} strokeWidth={1.75} aria-hidden="true" />
                Ispeziona
              </button>
            </>
          )}
        </>
      }
    >
      <div className="list-row-cell flex items-center justify-center border-b border-grid-border group-hover:bg-row-hover">
        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: color }} aria-hidden="true" />
      </div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{product.name}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{product.code ?? '—'}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {product.netPrice != null ? `€ ${product.netPrice.toFixed(2)}` : '—'}
      </div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">
        {product.defaultVatRate != null ? `${product.defaultVatRate}%` : '—'}
      </div>
      {ficConnection && (
        <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">{ficBadge(product.ficSyncStatus)}</div>
      )}
      <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-4 group-hover:bg-row-hover">
        {ficConnection && isSuperadmin && product.ficSyncStatus !== 'synced' && (
          <Link
            href={`/dashboard/settings/products/${product.id}/sync-fic`}
            aria-label="Sincronizza con Fatture in Cloud"
            title="Sincronizza con Fatture in Cloud"
            className="text-secondary transition hover:text-primary"
          >
            <RefreshCw size={15} strokeWidth={1.75} />
          </Link>
        )}
        {canUpdate && (
          <Link
            href={`/dashboard/settings/products/${product.id}/edit`}
            aria-label="Modifica prodotto"
            title="Modifica prodotto"
            className="text-secondary transition hover:text-primary"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {deleteOpen && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare il prodotto "${product.name}"?`}
          secondMessage="Confermi in modo definitivo? Il prodotto verrà eliminato (soft delete)."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </RowContextMenu>
  );
}
