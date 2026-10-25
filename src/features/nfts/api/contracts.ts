import type { EthAmount, Paginated } from '@/lib/api/types'
import type { NftListParams } from '@/lib/query/keys'

/**
 * NFT catalog contracts.
 *
 * The same types are used by the MSW handlers, the Axios endpoints and the UI,
 * so a change in the contract breaks compilation everywhere it matters.
 */

export const NFT_SORTS = ['recent', 'price-asc', 'price-desc', 'name-asc'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export const NFT_NETWORKS = ['Ethereum', 'Polygon', 'Solana'] as const
export type NftNetwork = (typeof NFT_NETWORKS)[number]

export interface NftAttribute {
  label: string
  value: string
}

export interface Nft {
  id: string
  name: string
  tokenId: string
  imageUrl: string
  priceEth: EthAmount
  compareAtPriceEth: EthAmount | null
  rarity: string | null
  category: string
  collection: string
  creator: { id: string; name: string }
  network: NftNetwork
  edition: { number: number; of: number }
  /** Units still purchasable. `0` means the edition is sold out. */
  available: number
  listedAt: string
  description: string
  attributes: NftAttribute[]
}

export interface NftReview {
  id: string
  author: string
  /** 3 to 5, matching the stars rendered by the UI. */
  rating: number
  comment: string
  createdAt: string
}

/** Provenance, contract and royalty notes shown in the detail tabs. */
export interface NftDetailInfo {
  provenance: string
  contracts: string
  royalties: string
}

/**
 * Detail payload: everything the list item has plus what only `/nfts/:id`
 * returns. The list stays lean; the detail screen never invents fields.
 */
export interface NftDetail extends Nft {
  rating: { average: string; count: number } | null
  reviews: NftReview[]
  info: NftDetailInfo
}

export interface FacetCount {
  value: string
  count: number
}

export interface NftFacets {
  categories: FacetCount[]
  networks: FacetCount[]
  priceRange: { min: EthAmount; max: EthAmount }
  total: number
}

export interface NftListResponse extends Paginated<Nft> {
  facets: NftFacets
}

/** Re-exported so handlers can type their query parsing without extra imports. */
export type { NftListParams }

export const CATALOG_PAGE_SIZE = 6

export type CatalogSortOption = { value: NftSort; label: string }

export const SORT_OPTIONS: readonly CatalogSortOption[] = [
  { value: 'recent', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'name-asc', label: 'Nome (A–Z)' },
]
