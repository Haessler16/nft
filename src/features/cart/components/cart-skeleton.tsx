import { Skeleton } from '@/components/ui/skeleton'

/**
 * First paint of `/cart` (docs/PLAN.md → Seções 1 e 7).
 *
 * The cart needs two round trips (entries first, then the quote), so the shell
 * mirrors the final layout: breadcrumb, title, two item rows and the summary
 * column. `role="status"` keeps screen readers informed while it resolves.
 */
export const CartSkeleton = () => (
  <section aria-busy="true" className="shell py-10" role="status">
    <span className="sr-only">Carregando o carrinho…</span>
    <Skeleton className="h-4 w-48" />
    <Skeleton className="mt-6 h-9 w-64" />
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-4">
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-start gap-4 rounded-md border bg-card p-4"
          >
            <Skeleton className="size-24 rounded-sm" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-36" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-40 self-end" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  </section>
)
