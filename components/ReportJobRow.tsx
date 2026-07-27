'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import DetailModal, { type DetailSection } from '@/components/DetailModal';
import RowActionsCell from '@/components/RowActionsCell';
import type { JobForecastRow, JobForecastCategory } from '@/lib/db';

const CATEGORY_LABEL: Record<JobForecastCategory, string> = {
  potenziale: 'Potenziale',
  preventivato: 'Preventivato',
  confermato: 'Confermato',
};

function formatEuro(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildDetailSections(row: JobForecastRow): DetailSection[] {
  return [
    {
      title: 'Lavoro',
      fields: [
        { label: 'Cliente', value: row.clientName },
        { label: 'Lavoro', value: row.title },
        { label: 'Categoria', value: CATEGORY_LABEL[row.category] },
      ],
    },
    {
      title: 'Economico',
      fields: [
        { label: 'Budget stimato', value: formatEuro(row.estimatedBudget) },
        { label: 'Spese fornitori', value: formatEuro(row.supplierCost) },
        { label: 'Fatturato', value: formatEuro(row.invoicedAmount) },
        { label: 'Margine', value: formatEuro(row.margin) },
      ],
    },
  ];
}

export default function ReportJobRow({ row }: { row: JobForecastRow }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="group contents">
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold tracking-[0.01em] text-primary group-hover:bg-row-hover"
      >
        {row.clientName}
      </div>
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {row.title}
      </div>
      <div onClick={() => setShowDetail(true)} className="list-row-cell flex cursor-pointer items-center whitespace-nowrap border-b border-grid-border px-3 py-2 group-hover:bg-row-hover">
        <span className="rounded-full bg-grid-header-bg px-2 py-0.5 text-[10px] font-medium text-secondary">{CATEGORY_LABEL[row.category]}</span>
      </div>
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center justify-end whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {formatEuro(row.estimatedBudget)}
      </div>
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center justify-end whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {formatEuro(row.supplierCost)}
      </div>
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center justify-end whitespace-nowrap border-b border-grid-border px-3 py-2 text-secondary group-hover:bg-row-hover group-hover:text-primary"
      >
        {formatEuro(row.invoicedAmount)}
      </div>
      <div
        onClick={() => setShowDetail(true)}
        className="list-row-cell flex cursor-pointer items-center justify-end whitespace-nowrap border-b border-grid-border px-3 py-2 font-semibold text-primary group-hover:bg-row-hover"
      >
        {formatEuro(row.margin)}
      </div>

      <RowActionsCell>
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          aria-label="Vedi dettaglio lavoro"
          title="Vedi dettaglio lavoro"
          className="text-secondary transition hover:text-primary"
        >
          <Eye size={15} strokeWidth={1.75} />
        </button>
      </RowActionsCell>

      {showDetail && <DetailModal title={row.title} sections={buildDetailSections(row)} onClose={() => setShowDetail(false)} />}
    </div>
  );
}
