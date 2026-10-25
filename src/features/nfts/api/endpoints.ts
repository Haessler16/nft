import type { NftDetail, NftListResponse } from '@/features/nfts/api/contracts'
import { http } from '@/lib/api/client'
import type { NftListParams } from '@/lib/query/keys'

/**
 * Catalog endpoints. The only place in the feature that knows about HTTP.
 * Requests accept an AbortSignal so TanStack Query can cancel stale calls.
 */
export const fetchNfts = async (
  params: NftListParams,
  signal?: AbortSignal,
): Promise<NftListResponse> => {
  const { data } = await http.get<NftListResponse>('/nfts', {
    signal,
    params: {
      q: params.q || undefined,
      categories: params.categories.length > 0 ? params.categories.join(',') : undefined,
      networks: params.networks.length > 0 ? params.networks.join(',') : undefined,
      minPrice: params.minPrice ?? undefined,
      maxPrice: params.maxPrice ?? undefined,
      sort: params.sort,
      page: params.page,
      pageSize: params.pageSize,
    },
  })

  return data
}

export const fetchNft = async (nftId: string, signal?: AbortSignal): Promise<NftDetail> => {
  const { data } = await http.get<NftDetail>(`/nfts/${encodeURIComponent(nftId)}`, { signal })
  return data
}

/**
 * Pieces of the same collection shown under the detail ("Mais desta coleção").
 *
 * `collection` is a dedicated query parameter, so the related strip never mixes
 * in items from other collections and never reuses another filter combination's
 * cache entry.
 */
export const fetchCollectionNfts = async (
  collection: string,
  signal?: AbortSignal,
): Promise<NftListResponse> => {
  const { data } = await http.get<NftListResponse>('/nfts', {
    signal,
    params: { collection, pageSize: 12 },
  })
  return data
}
