'use client';

import { useState } from 'react';
import type { HourlyContract, HourlyRateType } from '@/lib/types';

const RATE_LABELS: Record<HourlyRateType, string> = {
  standard: 'Standard (80€/h)',
  cheap: 'Cheap (45€/h)',
  custom: 'Custom',
};

export default function HourlyContractForm({
  contract,
  clientOptions,
  action,
}: {
  contract?: HourlyContract;
  clientOptions: { id: string; name: string }[];
  action: (formData: FormData) => void;
}) {
  const [rateType, setRateType] = useState<HourlyRateType>(contract?.rateType ?? 'standard');

  return (
    <form action={action} className="space-y-4 p-8">
      {!contract && (
        <div className="field-wrap">
          <select
            name="clientId"
            id="clientId"
            required
            defaultValue=""
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
          >
            <option value="" disabled>
              Seleziona un cliente
            </option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="clientId" className="field-floating-label">
            Cliente *
          </label>
        </div>
      )}

      <div className="flex gap-4">
        {(['standard', 'cheap', 'custom'] as HourlyRateType[]).map((rt) => (
          <label key={rt} className="flex items-center gap-1.5 text-sm text-primary">
            <input type="radio" name="rateType" value={rt} checked={rateType === rt} onChange={() => setRateType(rt)} />
            {RATE_LABELS[rt]}
          </label>
        ))}
      </div>

      {rateType === 'custom' && (
        <div className="field-wrap">
          <input
            type="number"
            name="customHourlyRate"
            id="customHourlyRate"
            step="0.01"
            min={0}
            defaultValue={contract?.customHourlyRate}
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="customHourlyRate" className="field-floating-label">
            Tariffa oraria custom (€/h) *
          </label>
        </div>
      )}

      {contract && (
        <div className="field-wrap">
          <select
            name="status"
            id="status"
            defaultValue={contract.status}
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary"
          >
            <option value="in_corso">In corso</option>
            <option value="non_in_corso">Non in corso</option>
          </select>
          <label htmlFor="status" className="field-floating-label">
            Stato
          </label>
        </div>
      )}

      <button type="submit" className="btn-accent rounded-lg px-4 py-2 text-sm font-medium">
        Salva
      </button>
    </form>
  );
}
