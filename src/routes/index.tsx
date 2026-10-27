import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { EditorialBanners } from '@/components/home/editorial-banners'
import { HomeHero } from '@/components/home/home-hero'
import { JournalSection } from '@/components/home/journal-section'
import { MobileHomeHeader } from '@/components/home/mobile-home-header'
import { CatalogSection } from '@/features/nfts/components/catalog-section'
import type { PriceRange } from '@/features/nfts/components/catalog-filters'
import { nftListQueryOptions } from '@/features/nfts/api/queries'
import {
  catalogSearchSchema,
  pruneCatalogSearch,
  resolveCatalogSearch,
  toNftListParams,
  type CatalogSearch,
  type CatalogTab,
} from '@/features/nfts/catalog-search'
import type { NftSort } from '@/features/nfts/api/contracts'
import { prefersReducedMotion } from '@/lib/motion'
import { useIsMobile } from '@/lib/use-media-query'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    // Prefetch keeps the shell instant on first paint; the component observes the
    // same cache entry, so a slow request shows skeletons instead of a blank page.
    context.queryClient.prefetchQuery(nftListQueryOptions(toNftListParams(resolveCatalogSearch(deps)))),
  head: () => ({
    meta: [
      { title: 'KURIO — marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara na Kurio.',
      },
      { property: 'og:title', content: 'KURIO — marketplace de NFTs' },
    ],
  }),
  component: HomeRoute,
})

function HomeRoute() {
  const search = resolveCatalogSearch(Route.useSearch())
  const navigate = Route.useNavigate()
  const isMobile = useIsMobile()

  const query = useQuery(nftListQueryOptions(toNftListParams(search)))

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({
      to: '/',
      search: (previous) => pruneCatalogSearch({ ...previous, ...patch }),
    })
  }

  const toggleInArray = (values: string[], value: string) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

  const onTabChange = (tab: CatalogTab) =>
    update({
      tab,
      page: 1,
      sort: tab === 'novos' ? 'recent' : tab === 'alta' ? 'price-desc' : search.sort,
    })

  const onSortChange = (sort: NftSort) => update({ sort, tab: 'todos', page: 1 })

  const onApplyPrice = (range: PriceRange) =>
    update({ min: range.min, max: range.max, page: 1 })

  const openMobileFilters = () => {
    const details = document.getElementById('catalogo-filtros-mobile')
    if (details instanceof HTMLDetailsElement) {
      details.open = true
      details.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      })
    }
  }

  return (
    <>
      {isMobile ? <MobileHomeHeader onOpenFilters={openMobileFilters} /> : null}
      <HomeHero />

      <CatalogSection
        data={query.data}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        isError={query.isError}
        tab={search.tab}
        sort={search.sort}
        page={search.page}
        price={{ min: search.min, max: search.max }}
        selectedCategories={search.categories}
        selectedNetworks={search.networks}
        onTabChange={onTabChange}
        onSortChange={onSortChange}
        onPageChange={(page) => update({ page })}
        onToggleCategory={(value) =>
          update({ categories: toggleInArray(search.categories, value), page: 1 })
        }
        onToggleNetwork={(value) =>
          update({ networks: toggleInArray(search.networks, value), page: 1 })
        }
        onApplyPrice={onApplyPrice}
        onClearFilters={() =>
          update({ q: '', categories: [], networks: [], min: null, max: null, page: 1 })
        }
        onRetry={() => void query.refetch()}
      />

      <EditorialBanners />
      <JournalSection />
    </>
  )
}
