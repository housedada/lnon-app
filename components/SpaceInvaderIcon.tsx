const ROWS = [
  '00100000100',
  '00010001000',
  '00111111100',
  '01101110110',
  '11111111111',
  '10111111101',
  '10100000101',
  '00011011000',
];

export default function SpaceInvaderIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={(size * ROWS.length) / ROWS[0].length} viewBox={`0 0 ${ROWS[0].length} ${ROWS.length}`} className={className} aria-hidden="true">
      {ROWS.flatMap((row, y) =>
        row.split('').map((cell, x) => (cell === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null))
      )}
    </svg>
  );
}
