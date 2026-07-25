import type { HourlyContract } from '@/lib/types';

export const HOURLY_RATES: Record<'standard' | 'cheap', number> = { standard: 80, cheap: 45 };

export function resolveHourlyRate(contract: Pick<HourlyContract, 'rateType' | 'customHourlyRate'>): number {
  if (contract.rateType === 'custom') return contract.customHourlyRate ?? 0;
  return HOURLY_RATES[contract.rateType];
}
