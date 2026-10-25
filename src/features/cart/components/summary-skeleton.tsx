import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading state of the order summary (docs/PLAN.md → Seções 1 e 7).
 *
 * It mirrors the exact shape of the resolved panel — same rows, same total,
 * same CTA — so the quote swap causes no layout shift, and it announces itself
 * to assistive tech instead of silently rendering grey blocks.
 */
export const SummarySkeleton = () => (
  <div aria-busy="true" className="flex flex-col gap-3">
    <span className="sr-only">Calculando o resumo com a API…</span>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-20" />
    </div>
    {[0, 1, 2].map((row) => (
      <div key={row} className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    ))}
    <div className="flex items-center justify-between border-t pt-3">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-6 w-24" />
    </div>
    <Skeleton className="h-9 w-full" />
  </div>
)
