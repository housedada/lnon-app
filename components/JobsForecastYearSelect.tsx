'use client';

import { useRouter } from 'next/navigation';

export default function JobsForecastYearSelect({ fiscalYear, yearOptions }: { fiscalYear: number; yearOptions: number[] }) {
  const router = useRouter();

  return (
    <select
      value={fiscalYear}
      onChange={(e) => router.push(`/dashboard/reports/lavori?year=${e.target.value}`)}
      className="field-input rounded-lg border border-grid-border bg-transparent px-3 py-2 text-sm text-primary"
    >
      {yearOptions.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
