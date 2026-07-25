import type { HourlyContract } from '@/lib/types';

export const HOURLY_RATES: Record<'standard' | 'cheap', number> = { standard: 80, cheap: 45 };

export function resolveHourlyRate(contract: Pick<HourlyContract, 'rateType' | 'customHourlyRate'>): number {
  if (contract.rateType === 'custom') return contract.customHourlyRate ?? 0;
  return HOURLY_RATES[contract.rateType];
}

// Descrizione larga e flessibile, tutte le altre colonne compresse al
// contenuto minimo necessario.
export const HOURLY_ENTRY_GRID_TEMPLATE = 'minmax(240px, 3fr) repeat(6, max-content)';
