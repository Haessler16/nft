import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface CatalogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/** Pages shown in full; larger catalogs now collapse around the current page. */
const visiblePages = (page: number, totalPages: number): number[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const start = Math.max(2, Math.min(page - 1, totalPages - 4))
  return [1, ...Array.from({ length: 4 }, (_, index) => start + index), totalPages]
}

export const CatalogPagination = ({ page, totalPages, onPageChange }: CatalogPaginationProps) => {
  if (totalPages <= 1) return null

  const pages = visiblePages(page, totalPages)
  const arrowClass =
    'grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground enabled:hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35'

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        className={arrowClass}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ArrowLeftIcon aria-hidden className="size-3.5" />
      </button>

      {pages.map((item, index) => {
        const previous = pages[index - 1]
        const showGap = previous !== undefined && item - previous > 1
        return (
          <span key={item} className="flex items-center gap-1.5">
            {showGap ? <span className="px-1 text-xs text-muted-foreground">…</span> : null}
            <button
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Página ${item}`}
              className={cn(
                'grid size-7 place-items-center rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
                item === page
                  ? 'bg-primary font-bold text-primary-foreground'
                  : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
              )}
            >
              {item}
            </button>
          </span>
        )
      })}

      <button
        type="button"
        className={arrowClass}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <ArrowRightIcon aria-hidden className="size-3.5" />
      </button>
    </nav>
  )
}
