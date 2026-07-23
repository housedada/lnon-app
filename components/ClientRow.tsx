'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, RefreshCw, AlertTriangle, Eye, Briefcase, Trash2, Bug } from 'lucide-react';
import type { Client, FicSyncStatus } from '@/lib/types';
import DetailModal, { type DetailSection } from '@/components/DetailModal';
import NewJobFromClientButton from '@/components/NewJobFromClientButton';
import RowContextMenu from '@/components/RowContextMenu';
import FormPageModal from '@/components/FormPageModal';
import JobForm from '@/components/JobForm';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { createJobAction } from '@/lib/actions/jobs';
import { deleteClientFromListAction } from '@/lib/actions/clients';
import { notify } from '@/lib/notify';

function ficBadge(status: FicSyncStatus) {
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

function buildDetailSections(client: Client): DetailSection[] {
  return [
    {
      title: 'Anagrafica',
      fields: [
        { label: 'Nome / Denominazione', value: client.name },
        { label: 'Referente', value: client.contactPerson },
        { label: 'Email', value: client.email, copyable: true },
        { label: 'Telefono', value: client.phone, copyable: true },
        { label: 'Fax', value: client.fax, copyable: true },
        { label: 'Codice interno', value: client.internalCode },
      ],
    },
    {
      title: 'Indirizzo',
      fields: [
        { label: 'Indirizzo', value: client.address },
        { label: 'Indirizzo di spedizione', value: client.shippingAddress },
        { label: 'Comune', value: client.city },
        { label: 'CAP', value: client.postalCode },
        { label: 'Provincia', value: client.province },
        { label: 'Paese', value: client.country },
        { label: 'Note indirizzo', value: client.addressNotes },
      ],
    },
    {
      title: 'Fatturazione',
      fields: [
        { label: 'P.IVA', value: client.taxId },
        { label: 'Codice Fiscale', value: client.fiscalCode },
        { label: 'PEC', value: client.pecEmail },
        { label: 'IBAN', value: client.iban },
        { label: 'Codice SDI', value: client.sdiCode },
        { label: 'Aliquota IVA predefinita', value: client.defaultVatRate != null ? `${client.defaultVatRate}%` : undefined },
        { label: 'Termini di pagamento', value: client.paymentTerms },
        { label: 'Metodo di pagamento', value: client.defaultPaymentMethod },
        { label: 'Sconto predefinito', value: client.defaultDiscount != null ? `${client.defaultDiscount}%` : undefined },
      ],
    },
    {
      title: 'Note',
      fields: [{ label: 'Note', value: client.notes }],
    },
  ];
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

type ModalKind = 'newJob' | 'delete' | null;

export default function ClientRow({
  client,
  canUpdate,
  canDelete,
  isSuperadmin,
  ficConnection,
  canSyncFic,
  canCreateJobs,
  clientOptions,
  contractOptions,
  productOptions,
  userOptions,
}: {
  client: Client;
  canUpdate: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  ficConnection: boolean;
  canSyncFic: boolean;
  canCreateJobs: boolean;
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);

  async function handleDeleteConfirm() {
    const res = await deleteClientFromListAction(client.id);
    notify(res.message);
    setModal(null);
  }

  function handleInspect() {
    console.log('[Ispeziona] Cliente', client);
    notify('Dati cliente loggati in console (apri gli strumenti sviluppatore).');
  }

  return (
    <RowContextMenu
      className="group contents"
      menu={
        <>
          {canCreateJobs && (
            <button type="button" onClick={() => setModal('newJob')} className={MENU_ROW_CLASS}>
              <Briefcase size={15} strokeWidth={1.75} aria-hidden="true" />
              Nuovo lavoro
            </button>
          )}
          <button type="button" onClick={() => setDetailOpen(true)} className={MENU_ROW_CLASS}>
            <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
            Vedi dettaglio
          </button>
          {canDelete && (
            <button type="button" onClick={() => setModal('delete')} className={`${MENU_ROW_CLASS} text-red-600 hover:bg-red-600/5`}>
              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Elimina cliente
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
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover"
      >
        {client.name}
      </div>
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {client.city ?? '—'}
      </div>
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {client.taxId ?? '—'}
      </div>
      {ficConnection && (
        <div
          onClick={() => setDetailOpen(true)}
          className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover"
        >
          {ficBadge(client.ficSyncStatus)}
        </div>
      )}

      <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 whitespace-nowrap border-b border-l border-grid-border bg-card-bg px-2 group-hover:bg-row-hover">
        {canCreateJobs && (
          <NewJobFromClientButton
            clientId={client.id}
            clientOptions={clientOptions}
            contractOptions={contractOptions}
            productOptions={productOptions}
            userOptions={userOptions}
          />
        )}
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label="Vedi dettaglio cliente"
          title="Vedi dettaglio cliente"
          className="text-secondary transition hover:text-primary"
        >
          <Eye size={15} strokeWidth={1.75} />
        </button>
        {ficConnection && canSyncFic && client.ficSyncStatus !== 'synced' && (
          <Link
            href={`/dashboard/clients/${client.id}/sync-fic`}
            aria-label="Sincronizza con Fatture in Cloud"
            title="Sincronizza con Fatture in Cloud"
            className="text-secondary transition hover:text-primary"
          >
            <RefreshCw size={15} strokeWidth={1.75} />
          </Link>
        )}
        {canUpdate && (
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            aria-label="Modifica cliente"
            title="Modifica cliente"
            className="text-secondary transition hover:text-primary"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {detailOpen && (
        <DetailModal title={client.name} sections={buildDetailSections(client)} onClose={() => setDetailOpen(false)} />
      )}

      {modal === 'newJob' && (
        <FormPageModal
          title="Nuovo Lavoro"
          icon={<Briefcase size={16} strokeWidth={1.75} className="text-white/70" aria-hidden="true" />}
          onClose={() => setModal(null)}
        >
          <JobForm
            defaultClientId={client.id}
            clientOptions={clientOptions}
            contractOptions={contractOptions}
            productOptions={productOptions}
            userOptions={userOptions}
            action={createJobAction}
          />
        </FormPageModal>
      )}
      {modal === 'delete' && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare il cliente "${client.name}"?`}
          secondMessage="Confermi in modo definitivo? Il cliente verrà eliminato (soft delete)."
          onConfirm={handleDeleteConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </RowContextMenu>
  );
}
