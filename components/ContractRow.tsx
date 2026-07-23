'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Bug } from 'lucide-react';
import RowContextMenu from '@/components/RowContextMenu';
import ContractLinkButton from '@/components/ContractLinkButton';
import DoubleConfirmModal from '@/components/DoubleConfirmModal';
import { deleteContractFromListAction } from '@/lib/actions/contracts';
import { notify } from '@/lib/notify';
import type { Contract, ContractStatus } from '@/lib/types';

const STATUS_LABEL: Record<ContractStatus, string> = {
  attivo: 'Attivo',
  da_definire: 'Da definire',
  disattivo: 'Disattivo',
};

const STATUS_BADGE: Record<ContractStatus, string> = {
  attivo: 'bg-green-600/10 text-green-700',
  da_definire: 'bg-grid-header-bg text-secondary',
  disattivo: 'bg-red-600/10 text-red-700',
};

function formatAmount(value?: number) {
  return value != null ? `€ ${value.toFixed(2)}` : '—';
}

function formatDate(value?: Date) {
  return value ? value.toLocaleDateString('it-IT') : '—';
}

function renderCell(contract: Contract, key: string): React.ReactNode {
  switch (key) {
    case 'client':
      return contract.clientName ?? contract.clientNameRaw;
    case 'linkStatus':
      return contract.clientId ? (
        <span className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-700">Sync</span>
      ) : (
        <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-xs font-medium text-secondary">No Sync</span>
      );
    case 'site':
      return contract.site ?? '—';
    case 'status':
      return (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[contract.status]}`}>
          {STATUS_LABEL[contract.status]}
        </span>
      );
    case 'billingMonth':
      return contract.billingMonth ?? '—';
    case 'maintenance':
      return formatAmount(contract.maintenanceWpAmount);
    case 'hosting':
      return formatAmount(contract.hostingAmount);
    case 'analytics':
      return formatAmount(contract.analyticsGdprAmount);
    case 'cookie':
      return formatAmount(contract.cookieAmount);
    case 'total':
      return formatAmount(contract.totalAmount);
    case 'serviceDescription':
      return contract.serviceDescription ?? '—';
    case 'package':
      return contract.package ?? '—';
    case 'notes':
      return contract.notes ?? '—';
    case 'provider':
      return contract.provider ?? '—';
    case 'providerPlan':
      return contract.providerPlan ?? '—';
    case 'providerExpiryDate':
      return formatDate(contract.providerExpiryDate);
    case 'providerCost':
      return formatAmount(contract.providerCost);
    default:
      return '—';
  }
}

const MENU_ROW_CLASS = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-secondary transition hover:bg-row-hover hover:text-primary';

export default function ContractRow({
  contract,
  dataColumns,
  canUpdate,
  canDelete,
  isSuperadmin,
  clientOptions,
}: {
  contract: Contract;
  dataColumns: { key: string; label: string }[];
  canUpdate: boolean;
  canDelete: boolean;
  isSuperadmin: boolean;
  clientOptions: { id: string; name: string }[];
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDeleteConfirm() {
    const res = await deleteContractFromListAction(contract.id);
    notify(res.message);
    setDeleteOpen(false);
  }

  function handleInspect() {
    console.log('[Ispeziona] Contratto', contract);
    notify('Dati contratto loggati in console (apri gli strumenti sviluppatore).');
  }

  return (
    <RowContextMenu
      className="group contents"
      menu={
        <>
          {canUpdate && (
            <Link href={`/dashboard/contracts/${contract.id}/edit`} className={MENU_ROW_CLASS}>
              <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
              Modifica contratto
            </Link>
          )}
          {canDelete && (
            <button type="button" onClick={() => setDeleteOpen(true)} className={`${MENU_ROW_CLASS} text-red-600 hover:bg-red-600/5`}>
              <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Elimina contratto
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
      {dataColumns.map((col) => (
        <div
          key={col.key}
          className="list-row-cell flex items-center whitespace-nowrap border-b border-grid-border bg-card-bg px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary [&:first-child]:font-semibold [&:first-child]:tracking-[0.01em] [&:first-child]:text-primary"
        >
          {renderCell(contract, col.key)}
        </div>
      ))}
      <div className="sticky right-0 z-[5] flex items-center justify-end gap-2.5 border-b border-l border-grid-border bg-card-bg px-2 group-hover:bg-row-hover">
        {canUpdate && !contract.clientId && (
          <ContractLinkButton contractId={contract.id} contractClientName={contract.clientNameRaw} clientOptions={clientOptions} />
        )}
        {canUpdate && (
          <Link
            href={`/dashboard/contracts/${contract.id}/edit`}
            aria-label="Modifica contratto"
            title="Modifica contratto"
            className="text-secondary transition hover:text-primary"
          >
            <Pencil size={15} strokeWidth={1.75} />
          </Link>
        )}
      </div>

      {deleteOpen && (
        <DoubleConfirmModal
          firstMessage={`Sei sicuro di voler eliminare il contratto di "${contract.clientName ?? contract.clientNameRaw}"?`}
          secondMessage="Confermi in modo definitivo? Il contratto verrà eliminato (soft delete)."
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </RowContextMenu>
  );
}
