import Decimal from 'decimal.js'
import { http, HttpResponse } from 'msw'

import {
  CATALOG_PAGE_SIZE,
  NFT_NETWORKS,
  NFT_SORTS,
  type FacetCount,
  type NftFacets,
  type NftListResponse,
  type NftNetwork,
  type NftSort,
} from '@/features/nfts/api/contracts'
import { db } from '@/mocks/db'

const errorEnvelope = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status })

const parseList = (url: URL, key: string): string[] =>
  (url.searchParams.get(key) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

/** Facet counts keep the order the categories appear in the catalog seed. */
const countBy = (values: string[]): FacetCount[] => {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].map(([value, count]) => ({ value, count }))
}

const sortNfts = (nfts: NftListResponse['items'], sort: NftSort) => {
  const sorted = [...nfts]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => new Decimal(a.priceEth).comparedTo(b.priceEth))
    case 'price-desc':
      return sorted.sort((a, b) => new Decimal(b.priceEth).comparedTo(a.priceEth))
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'recent':
    default:
      return sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
  }
}

export const nftHandlers = [
  http.get('/api/nfts', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const collection = (url.searchParams.get('collection') ?? '').trim()
    const categories = parseList(url, 'categories')
    const networks = parseList(url, 'networks')
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const sortParam = url.searchParams.get('sort') ?? 'recent'
    const sort: NftSort = NFT_SORTS.includes(sortParam as NftSort)
      ? (sortParam as NftSort)
      : 'recent'
    const pageParam = Number(url.searchParams.get('page') ?? '1')
    const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1
    const sizeParam = Number(url.searchParams.get('pageSize') ?? CATALOG_PAGE_SIZE)
    const pageSize = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.floor(sizeParam) : CATALOG_PAGE_SIZE

    const all = db.nfts

    const filtered = all.filter((nft) => {
      if (
        q &&
        !`${nft.name} ${nft.collection} ${nft.category}`.toLowerCase().includes(q)
      ) {
        return false
      }
      // Exact collection match: the detail's related strip must not depend on
      // the catalog's text search (docs/PLAN.md → Seção 6).
      if (collection && nft.collection !== collection) return false
      if (categories.length > 0 && !categories.includes(nft.category)) return false
      if (networks.length > 0 && !networks.includes(nft.network)) return false
      if (minPrice && new Decimal(nft.priceEth).lessThan(minPrice)) return false
      if (maxPrice && new Decimal(nft.priceEth).greaterThan(maxPrice)) return false
      return true
    })

    const sorted = sortNfts(filtered, sort)
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
    const currentPage = Math.min(page, totalPages)

    const prices = all.map((nft) => new Decimal(nft.priceEth))
    const lowest = prices.reduce(
      (min, price) => (price.lessThan(min) ? price : min),
      prices[0] ?? new Decimal(0),
    )
    const highest = prices.reduce(
      (max, price) => (price.greaterThan(max) ? price : max),
      prices[0] ?? new Decimal(0),
    )

    const facets: NftFacets = {
      categories: countBy(all.map((nft) => nft.category)),
      networks: countBy(all.map((nft) => nft.network)),
      priceRange: { min: lowest.toFixed(2), max: highest.toFixed(2) },
      total: all.length,
    }

    const body: NftListResponse = {
      items: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      meta: { page: currentPage, pageSize, total: sorted.length, totalPages },
      facets,
    }

    return HttpResponse.json(body)
  }),

  http.get('/api/nfts/:nftId', ({ params }) => {
    const nft = db.nfts.find((item) => item.id === params.nftId || item.tokenId === params.nftId)
    if (!nft) {
      return errorEnvelope(404, 'NOT_FOUND', 'NFT não encontrado.')
    }
    return HttpResponse.json(nft)
  }),
]

/** Network list kept exported so catalog filters and fixtures can't drift apart. */
export const supportedNetworks: readonly NftNetwork[] = NFT_NETWORKS
