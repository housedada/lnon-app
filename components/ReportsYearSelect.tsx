'use client';

import { useRouter } from 'next/navigation';

export default function ReportsYearSelect({
  basePath,
  fiscalYear,
  yearOptions,
}: {
  basePath: string;
  fiscalYear: number;
  yearOptions: number[];
}) {
  const router = useRouter();

  return (
    <select
      value={fiscalYear}
      onChange={(e) => router.push(`${basePath}?year=${e.target.value}`)}
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
