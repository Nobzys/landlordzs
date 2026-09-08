import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ListingPaginationProps {
  currentPage: number
  totalPages:  number
  buildHref:   (page: number) => string
}

/**
 * Returns an array of page numbers (and '...' sentinels) to render.
 * Always shows first + last page, and a window of ±2 around the current page.
 *
 * Example — page 6 of 20:  [1, '...', 4, 5, 6, 7, 8, '...', 20]
 */
function getPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const delta = 2
  const result: (number | '...')[] = []

  result.push(1)

  const rangeStart = Math.max(2, current - delta)
  const rangeEnd   = Math.min(total - 1, current + delta)

  if (rangeStart > 2)       result.push('...')
  for (let p = rangeStart; p <= rangeEnd; p++) result.push(p)
  if (rangeEnd < total - 1) result.push('...')

  result.push(total)
  return result
}

export function ListingPagination({
  currentPage,
  totalPages,
  buildHref,
}: ListingPaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageRange(currentPage, totalPages)

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 flex-wrap pt-4"
    >
      {/* Previous */}
      {currentPage <= 1 ? (
        <span className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/40 select-none cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      ) : (
        <Link
          href={buildHref(currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      )}

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 py-1.5 text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'min-w-[36px] rounded-md px-3 py-1.5 text-sm font-medium text-center transition-colors',
              page === currentPage
                ? 'bg-[#B71C1C] text-white pointer-events-none'
                : 'border hover:bg-accent'
            )}
          >
            {page}
          </Link>
        )
      )}

      {/* Next */}
      {currentPage >= totalPages ? (
        <span className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/40 select-none cursor-not-allowed">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={buildHref(currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
