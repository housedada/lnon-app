export default function PacmanLoader({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`pacman-loader ${className ?? ''}`.trim()} />;
}
