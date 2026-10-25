import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { fetchCollectionNfts, fetchNft, fetchNfts } from '@/features/nfts/api/endpoints'
import { queryKeys } from '@/lib/query/keys'
import type { NftListParams } from '@/lib/query/keys'

/**
 * Query options shared by route loaders and components.
 *
 * `keepPreviousData` keeps the current page on screen while the next filter
 * combination loads, so the grid doesn't collapse into a skeleton on every
 * keystroke — the request still reflects the new params because the key changes.
 */
export const nftListQueryOptions = (params: NftListParams) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
  })

export const nftDetailQueryOptions = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => fetchNft(nftId, signal),
  })

/** "Mais desta coleção": cached per collection, independent of catalog filters. */
export const relatedNftsQueryOptions = (collection: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.related(collection),
    queryFn: ({ signal }) => fetchCollectionNfts(collection, signal),
    staleTime: 60_000,
  })
