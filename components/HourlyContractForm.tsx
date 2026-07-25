'use client';

import { useState } from 'react';
import { HOURLY_RATES } from '@/lib/hourlyBilling';
import AssignedToPicker from '@/components/AssignedToPicker';
import type { HourlyContract, HourlyRateType } from '@/lib/types';

const RATE_LABELS: Record<HourlyRateType, string> = {
  standard: `Standard (${HOURLY_RATES.standard}€/h)`,
  cheap: `Cheap (${HOURLY_RATES.cheap}€/h)`,
  custom: 'Custom',
};

export default function HourlyContractForm({
  contract,
  clientOptions,
  userOptions,
  onSubmit,
  isPending,
}: {
  contract?: HourlyContract;
  clientOptions: { id: string; name: string }[];
  userOptions: { id: string; name: string; color?: string }[];
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
}) {
  const [rateType, setRateType] = useState<HourlyRateType>(contract?.rateType ?? 'standard');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4 p-8"
    >
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

      {!contract && (
        <div className="field-wrap">
          <input
            type="text"
            name="referenceName"
            id="referenceName"
            placeholder=" "
            className="field-input w-full border border-grid-border bg-transparent px-3 pb-2 pt-4 text-sm text-primary placeholder-transparent"
          />
          <label htmlFor="referenceName" className="field-floating-label">
            Nome di riferimento (opzionale, es. nome sito/progetto se diverso dal cliente fatturato)
          </label>
        </div>
      )}

      {!contract && <AssignedToPicker userOptions={userOptions} />}

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

      <button type="submit" disabled={isPending} className="btn-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
        Salva
      </button>
    </form>
  );
}
