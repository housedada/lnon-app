'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, RefreshCw, AlertTriangle, Eye } from 'lucide-react';
import type { Client, FicSyncStatus } from '@/lib/types';
import DetailModal, { type DetailSection } from '@/components/DetailModal';
import NewJobFromClientButton from '@/components/NewJobFromClientButton';

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

export default function ClientRow({
  client,
  canUpdate,
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
  ficConnection: boolean;
  canSyncFic: boolean;
  canCreateJobs: boolean;
  clientOptions: { id: string; name: string }[];
  contractOptions: { id: string; label: string }[];
  productOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="group contents">
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover"
      >
        {client.name}
      </div>
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {client.city ?? '—'}
      </div>
      <div
        onClick={() => setDetailOpen(true)}
        className="list-row-cell flex cursor-pointer items-center border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {client.taxId ?? '—'}
      </div>
      {ficConnection && (
        <div
          onClick={() => setDetailOpen(true)}
          className="list-row-cell flex cursor-pointer items-center border-b border-grid-border px-3 py-2 group-hover:bg-row-hover"
        >
          {ficBadge(client.ficSyncStatus)}
        </div>
      )}
      <div className="sticky right-30 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
        {canCreateJobs && (
          <NewJobFromClientButton
            clientId={client.id}
            clientOptions={clientOptions}
            contractOptions={contractOptions}
            productOptions={productOptions}
            userOptions={userOptions}
          />
        )}
      </div>
      <div className="sticky right-20 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label="Vedi dettaglio cliente"
          className="text-secondary transition hover:text-primary"
        >
          <Eye size={15} strokeWidth={1.75} />
        </button>
      </div>
      <div className="sticky right-10 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
        {ficConnection && canSyncFic && client.ficSyncStatus !== 'synced' && (
          <Link
            href={`/dashboard/clients/${client.id}/sync-fic`}
            aria-label="Sincronizza con Fatture in Cloud"
            className="text-secondary transition hover:text-primary"
          >
            <RefreshCw size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>
      <div className="sticky right-0 z-[5] flex aspect-square items-center justify-center border-b border-l border-grid-border bg-card-bg group-hover:bg-row-hover">
        {canUpdate && (
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            aria-label="Modifica cliente"
            className="text-secondary transition hover:text-primary"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {detailOpen && (
        <DetailModal title={client.name} sections={buildDetailSections(client)} onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}
