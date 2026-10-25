import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder with the exact dimensions of `NftCard`, so the grid never shifts
 * when the real data arrives. Shimmer comes from the `.skeleton-shimmer` utility,
 * which is disabled for `prefers-reduced-motion`.
 */
export const NftCardSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden>
    <Skeleton className="aspect-[255/247] w-full rounded-md" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/3" />
  </div>
)

export const NftGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }, (_, index) => (
      <NftCardSkeleton key={index} />
    ))}
  </div>
)
