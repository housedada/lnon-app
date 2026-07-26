export default function CrownIcon({ size = 12, className }: { size?: number; className?: string }) {
  const gradientId = 'crown-gold-gradient';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f5b942" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M3 8l4 3 5-6 5 6 4-3-1.5 10h-15L3 8z"
      />
    </svg>
  );
}
