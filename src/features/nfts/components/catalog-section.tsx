import { ChevronDownIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { NftListResponse, NftSort } from '@/features/nfts/api/contracts'
import { CatalogFilters, type PriceRange } from '@/features/nfts/components/catalog-filters'
import { CatalogPagination } from '@/features/nfts/components/catalog-pagination'
import { CatalogToolbar } from '@/features/nfts/components/catalog-toolbar'
import type { CatalogTab } from '@/features/nfts/catalog-search'
import { FeaturedNftCard } from '@/features/nfts/components/featured-nft-card'
import { NftCard } from '@/features/nfts/components/nft-card'
import { NftGridSkeleton } from '@/features/nfts/components/nft-card-skeleton'

interface CatalogSectionProps {
  data: NftListResponse | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  tab: CatalogTab
  sort: NftSort
  page: number
  price: PriceRange
  selectedCategories: string[]
  selectedNetworks: string[]
  onTabChange: (tab: CatalogTab) => void
  onSortChange: (sort: NftSort) => void
  onPageChange: (page: number) => void
  onToggleCategory: (value: string) => void
  onToggleNetwork: (value: string) => void
  onApplyPrice: (range: PriceRange) => void
  onClearFilters: () => void
  onRetry: () => void
}

/**
 * Catalog section: filters + featured offer + grid + pagination.
 *
 * Loading shows dimension-stable skeletons, error offers an explicit retry and
 * an empty result explains which filters can be cleared — none of these states
 * hide the filters, so the user is never trapped.
 */
export const CatalogSection = ({
  data,
  isLoading,
  isFetching,
  isError,
  tab,
  sort,
  page,
  price,
  selectedCategories,
  selectedNetworks,
  onTabChange,
  onSortChange,
  onPageChange,
  onToggleCategory,
  onToggleNetwork,
  onApplyPrice,
  onClearFilters,
  onRetry,
}: CatalogSectionProps) => {
  const items = data?.items ?? []
  const facets = data?.facets
  const totalPages = data?.meta.totalPages ?? 1
  const featured = items.find((nft) => nft.compareAtPriceEth) ?? items[0]

  const filters = (
    <CatalogFilters
      key={`${price.min ?? 'min'}-${price.max ?? 'max'}`}
      facets={facets}
      selectedCategories={selectedCategories}
      selectedNetworks={selectedNetworks}
      price={price}
      onToggleCategory={onToggleCategory}
      onToggleNetwork={onToggleNetwork}
      onApplyPrice={onApplyPrice}
      onClear={onClearFilters}
    />
  )

  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-titulo"
      className="shell mt-8 scroll-mt-20 md:mt-16"
    >
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden lg:block" data-testid="catalogo-filtros-desktop">
          <div className="rounded-md bg-card p-4">{filters}</div>
          {featured ? <FeaturedNftCard nft={featured} className="mt-6" /> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <CatalogToolbar
            tab={tab}
            sort={sort}
            onTabChange={onTabChange}
            onSortChange={onSortChange}
          />

          <div className="flex justify-end lg:hidden">
            <details
              className="group rounded-full bg-card px-4 py-2"
              data-testid="catalogo-filtros-mobile"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.7rem] font-bold uppercase">
                Filtros
                <ChevronDownIcon
                  aria-hidden
                  className="size-4 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="w-[min(20rem,calc(100vw-3rem))] pt-5">{filters}</div>
            </details>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {isFetching && !isLoading ? 'Atualizando resultados do catálogo.' : ''}
          </p>

          {isLoading ? (
            <NftGridSkeleton count={6} />
          ) : isError ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-md bg-card p-6 text-sm"
            >
              <p className="font-bold text-destructive">Não foi possível carregar o catálogo</p>
              <p className="text-muted-foreground">
                A conexão falhou ou o serviço está indisponível. Tente novamente.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RefreshCwIcon aria-hidden />
                Tentar novamente
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md bg-card p-6 text-sm">
              <p className="font-bold">Nenhum NFT encontrado</p>
              <p className="text-muted-foreground">
                Nenhuma peça corresponde à combinação atual de busca e filtros.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                data-testid="catalogo-limpar-vazio"
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-8">
              {items.map((nft) => (
                <li key={nft.id}>
                  <NftCard nft={nft} />
                </li>
              ))}
            </ul>
          )}

          <CatalogPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      </div>
    </section>
  )
}
