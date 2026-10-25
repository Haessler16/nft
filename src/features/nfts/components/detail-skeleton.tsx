import { Skeleton } from '@/components/ui/skeleton'
import { NftCardSkeleton } from '@/features/nfts/components/nft-card-skeleton'

/**
 * Loading state of the detail screen (docs/PLAN.md → Seções 1 e 6).
 *
 * It mirrors the final layout — breadcrumb, gallery column, info column, tabs
 * and the related strip — so the page never reflows when the NFT arrives, and
 * the shimmer respects `prefers-reduced-motion` through `.skeleton-shimmer`.
 */
export const DetailSkeleton = () => (
  <section className="shell py-10" aria-busy="true">
    <span className="sr-only">Carregando os detalhes do NFT…</span>

    <Skeleton className="h-4 w-44" />

    <div className="mt-6 grid gap-10 lg:grid-cols-2">
      <div className="flex gap-4">
        <div className="hidden flex-col gap-3 sm:flex">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-16 rounded-sm" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full rounded-md" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-32" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-16" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-36" />
        </div>
        <div className="flex flex-col gap-2 border-t pt-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>

    <div className="mt-12 flex flex-col gap-6 border-t pt-8">
      <div className="flex gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-52" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>

    <div className="mt-12 border-t pt-8">
      <Skeleton className="mb-6 h-5 w-52" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <NftCardSkeleton key={index} />
        ))}
      </div>
    </div>
  </section>
)
