import { z } from 'zod'

import { CATALOG_PAGE_SIZE, NFT_SORTS } from '@/features/nfts/api/contracts'
import type { NftListParams } from '@/lib/query/keys'

/** Catalog views rendered as tabs above the grid. */
export const CATALOG_TABS = [
  { value: 'todos', label: 'Todos os NFTs' },
  { value: 'novos', label: 'Novos lançamentos' },
  { value: 'alta', label: 'Em alta' },
] as const

export type CatalogTab = (typeof CATALOG_TABS)[number]['value']

/**
 * Catalog URL state.
 *
 * Fields are optional so links to `/` don't need to spell out every default, and
 * each one has a deterministic fallback: a stale or hand-edited URL degrades to
 * a valid catalog instead of crashing. `resolveCatalogSearch` is the single place
 * that applies those defaults, so the request, the cache key and the UI agree.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().optional().catch(undefined),
  categories: z.array(z.string()).optional().catch(undefined),
  networks: z.array(z.string()).optional().catch(undefined),
  min: z.string().nullish().catch(undefined),
  max: z.string().nullish().catch(undefined),
  sort: z.enum(NFT_SORTS).optional().catch(undefined),
  tab: z.enum(['todos', 'novos', 'alta']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export interface ResolvedCatalogSearch {
  q: string
  categories: string[]
  networks: string[]
  min: string | null
  max: string | null
  sort: (typeof NFT_SORTS)[number]
  tab: 'todos' | 'novos' | 'alta'
  page: number
}

export const resolveCatalogSearch = (search: CatalogSearch): ResolvedCatalogSearch => ({
  q: search.q ?? '',
  categories: search.categories ?? [],
  networks: search.networks ?? [],
  min: search.min ?? null,
  max: search.max ?? null,
  sort: search.sort ?? 'recent',
  tab: search.tab ?? 'todos',
  page: search.page ?? 1,
})

/**
 * Drops empty filters before writing the URL, so state transitions don't leave
 * `?q=&categories=[]&min=null` noise behind.
 */
export const pruneCatalogSearch = (search: CatalogSearch): CatalogSearch => ({
  ...search,
  q: search.q?.trim() ? search.q.trim() : undefined,
  categories: search.categories?.length ? search.categories : undefined,
  networks: search.networks?.length ? search.networks : undefined,
  min: search.min ?? undefined,
  max: search.max ?? undefined,
})

export const toNftListParams = (search: ResolvedCatalogSearch): NftListParams => ({
  q: search.q,
  categories: search.categories,
  networks: search.networks,
  minPrice: search.min,
  maxPrice: search.max,
  sort: search.sort,
  page: search.page,
  pageSize: CATALOG_PAGE_SIZE,
})
