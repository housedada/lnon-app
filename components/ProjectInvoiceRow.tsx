'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Trash2, Bug, FileOutput, Eye, RefreshCw } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import InvoiceRowSelectCheckbox from '@/components/InvoiceRowSelectCheckbox';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import InvoicePreviewModal from '@/components/InvoicePreviewModal';
import SyncResultsModal from '@/components/SyncResultsModal';
import MaskedAmount from '@/components/MaskedAmount';
import { archiveProjectInvoicesAction, deleteProjectInvoiceAction, generateFicInvoiceAction } from '@/lib/actions/projectInvoices';
import { syncInvoiceLineItemsForIdsAction, type SyncLineItemsResult } from '@/lib/actions/fic';
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
  className,
}: {
  invoice: ProjectInvoice;
  isSuperadmin: boolean;
  canManage: boolean;
  showAmounts: boolean;
  className?: string;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ficConfirmOpen, setFicConfirmOpen] = useState(false);
  const [ficOverwriteWarning, setFicOverwriteWarning] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncLineItemsResult[] | null>(null);
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

  async function handleGenerateFic(confirmOverwrite?: boolean) {
    const res = await generateFicInvoiceAction(invoice.id, { confirmOverwrite });
    if (res.needsOverwriteConfirm) {
      setFicOverwriteWarning(res.message);
      setFicConfirmOpen(true);
      return;
    }
    notify(res.message);
    setFicConfirmOpen(false);
    setFicOverwriteWarning(null);
    if (res.success) router.refresh();
  }

  async function handleSyncLineItems() {
    const res = await syncInvoiceLineItemsForIdsAction([invoice.id]);
    setSyncResults(res.results);
    router.refresh();
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
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover">{invoice.clientName}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.projectTitle}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.jobTitle ?? '—'}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{showAmounts ? formatAmount(invoice.netAmount) : <MaskedAmount />}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{invoice.vatRate}%</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold text-primary group-hover:bg-row-hover">{showAmounts ? formatAmount(invoice.totalAmount) : <MaskedAmount />}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[invoice.status]}`}>{STATUS_LABEL[invoice.status]}</span>
      </div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary">{formatDate(invoice.createdAt)}</div>
      <div onClick={() => setPreviewOpen(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        {!invoice.ficInvoiceId ? (
          <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">Non collegata a FIC</span>
        ) : invoice.lineItemsSyncedAt ? (
          <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-medium text-green-700">Sincronizzato il {formatDate(invoice.lineItemsSyncedAt)}</span>
        ) : (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">Non sincronizzato</span>
        )}
      </div>

      <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-4 group-hover:bg-row-hover">
        <button type="button" onClick={() => setPreviewOpen(true)} aria-label="Vedi fattura" title="Vedi fattura" className="text-secondary transition hover:text-primary">
          <Eye size={15} strokeWidth={1.75} />
        </button>
        {canManage && (
          <>
            <button type="button" onClick={handleArchive} aria-label="Archivia fattura" title="Archivia fattura" className="text-secondary transition hover:text-primary">
              <Archive size={15} strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => setDeleteOpen(true)} aria-label="Elimina fattura" title="Elimina fattura" className="text-secondary transition hover:text-red-600">
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {previewOpen && (
        <InvoicePreviewModal
          invoice={invoice}
          showAmounts={showAmounts}
          onClose={() => setPreviewOpen(false)}
          onGenerateFic={() => { setPreviewOpen(false); setFicOverwriteWarning(null); setFicConfirmOpen(true); }}
        />
      )}

      {deleteOpen && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare la fattura di "${invoice.clientName}"?`}
          secondMessage="Confermi in modo definitivo? La fattura verrà spostata nel cestino: potrai ripristinarla in seguito."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {ficConfirmOpen && (
        <DoubleConfirmModal
          key={ficOverwriteWarning ?? 'new'}
          title="Genera fattura su Fatture in Cloud"
          firstMessage={
            ficOverwriteWarning
              ? `${ficOverwriteWarning} Generandone una nuova, il riferimento al documento precedente verrà sovrascritto in LNON (il vecchio documento resta comunque presente su FIC). Procedere?`
              : 'Verrà creata una fattura definitiva e numerata su Fatture in Cloud (non è possibile crearla come bozza). Procedere?'
          }
          secondMessage="Confermi in modo definitivo? L'operazione non è annullabile da LNON."
          confirmLabel="Genera su FIC"
          onConfirm={() => handleGenerateFic(!!ficOverwriteWarning)}
          onClose={() => { setFicConfirmOpen(false); setFicOverwriteWarning(null); }}
        />
      )}

      {syncResults && <SyncResultsModal results={syncResults} onClose={() => setSyncResults(null)} />}
    </>
  );

  if (!canManage) {
    return <div className={`group contents ${className ?? ''}`.trim()}>{cells}</div>;
  }

  return (
    <RowContextMenu
      className={`group contents ${className ?? ''}`.trim()}
      menu={
        <>
          <button type="button" onClick={() => setPreviewOpen(true)} className={MENU_ROW_CLASS}>
            <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
            Vedi fattura
          </button>
          <button type="button" onClick={() => { setFicOverwriteWarning(null); setFicConfirmOpen(true); }} className={MENU_ROW_CLASS}>
            <FileOutput size={15} strokeWidth={1.75} aria-hidden="true" />
            Genera su FIC
          </button>
          {isSuperadmin && invoice.ficInvoiceId && (
            <button type="button" onClick={handleSyncLineItems} className={MENU_ROW_CLASS}>
              <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
              Sincronizza sottovoci
            </button>
          )}
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
