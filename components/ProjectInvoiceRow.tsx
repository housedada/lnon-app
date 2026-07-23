'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Trash2, Bug, FileOutput } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import InvoiceRowSelectCheckbox from '@/components/InvoiceRowSelectCheckbox';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import MaskedAmount from '@/components/MaskedAmount';
import { archiveProjectInvoicesAction, deleteProjectInvoiceAction, generateFicInvoiceAction } from '@/lib/actions/projectInvoices';
import { notify } from '@/lib/notify';
import type { ProjectInvoice, ProjectInvoiceStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProjectInvoiceStatus, string> = {
  da_fatturare: 'Da fatturare',
  fatturata: 'Fatturata',
  annullata: 'Annullata',
  accorpata: 'Accorpata',
};

const STATUS_BADGE: Record<ProjectInvoiceStatus, string> = {
  da_fatturare: 'bg-amber-500/10 text-amber-700',
  fatturata: 'bg-green-600/10 text-green-700',
  annullata: 'bg-red-600/10 text-red-700',
  accorpata: 'bg-grid-header-bg text-secondary',
};

function formatAmount(value: number) {
  return `€ ${value.toFixed(2)}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString('it-IT');
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

export default function ProjectInvoiceRow({
  invoice,
  isSuperadmin,
  canManage,
  showAmounts,
}: {
  invoice: ProjectInvoice;
  isSuperadmin: boolean;
  canManage: boolean;
  showAmounts: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  async function handleDeleteConfirm() {
    const res = await deleteProjectInvoiceAction(invoice.id);
    notify(res.message);
    setDeleteOpen(false);
    if (res.success) router.refresh();
  }

  async function handleArchive() {
    const res = await archiveProjectInvoicesAction([invoice.id]);
    notify(res.message);
    if (res.success) router.refresh();
  }

  async function handleGenerateFic() {
    const res = await generateFicInvoiceAction(invoice.id);
    notify(res.message);
  }

  function handleInspect() {
    console.log('[Ispeziona] Fattura progetto', invoice);
    notify('Dati fattura loggati in console (apri gli strumenti sviluppatore).');
  }

  const cells = (
    <>
      {canManage && (
        <div className="list-cell-deco flex items-center justify-center border-b border-grid-border px-1 py-2 group-hover:bg-row-hover">
          <InvoiceRowSelectCheckbox invoiceId={invoice.id} />
        </div>
      )}
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{invoice.clientName}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.projectTitle}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.jobTitle ?? '—'}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{showAmounts ? formatAmount(invoice.netAmount) : <MaskedAmount />}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.vatRate}%</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold text-primary group-hover:bg-row-hover">{showAmounts ? formatAmount(invoice.totalAmount) : <MaskedAmount />}</div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[invoice.status]}`}>{STATUS_LABEL[invoice.status]}</span>
      </div>
      <div className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(invoice.createdAt)}</div>

      {canManage && (
        <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-4 group-hover:bg-row-hover">
          <button type="button" onClick={handleArchive} aria-label="Archivia fattura" title="Archivia fattura" className="text-secondary transition hover:text-primary">
            <Archive size={15} strokeWidth={1.75} />
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} aria-label="Elimina fattura" title="Elimina fattura" className="text-secondary transition hover:text-red-600">
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {deleteOpen && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare la fattura di "${invoice.clientName}"?`}
          secondMessage="Confermi in modo definitivo? La fattura verrà spostata nel cestino: potrai ripristinarla in seguito."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );

  if (!canManage) {
    return <div className="group contents">{cells}</div>;
  }

  return (
    <RowContextMenu
      className="group contents"
      menu={
        <>
          <button type="button" onClick={handleGenerateFic} className={MENU_ROW_CLASS}>
            <FileOutput size={15} strokeWidth={1.75} aria-hidden="true" />
            Genera su FIC
            <span className="ml-auto text-[10px] text-secondary">Presto</span>
          </button>
          <button type="button" onClick={handleArchive} className={MENU_ROW_CLASS}>
            <Archive size={15} strokeWidth={1.75} aria-hidden="true" />
            Archivia
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={`${MENU_ROW_CLASS} text-red-600 hover:bg-red-600/5`}>
            <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
            Elimina fattura
          </button>
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
      {cells}
    </RowContextMenu>
  );
}
