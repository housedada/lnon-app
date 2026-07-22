import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-secondary whitespace-nowrap">
        Pagina {currentPage} di {totalPages}
      </span>
      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            aria-label="Pagina precedente"
            className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </Link>
        ) : (
          <span
            aria-hidden="true"
            className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </span>
        )}
        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            aria-label="Pagina successiva"
            className="flex items-center justify-center rounded-lg border border-muted p-1.5 text-primary transition hover:bg-row-hover"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </Link>
        ) : (
          <span
            aria-hidden="true"
            className="flex cursor-not-allowed items-center justify-center rounded-lg border border-muted p-1.5 text-muted"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  );
}
