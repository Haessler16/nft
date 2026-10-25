/**
 * Query key factory.
 *
 * Rules:
 * - public resources are keyed by their full query params so results are never
 *   shared between different filters or pages;
 * - private resources are prefixed with the user id so a logout / user switch
 *   can drop every private entry without touching the public catalog cache.
 */

export type UserScope = string // user id, or 'guest' before authentication

/** Cart/favorites scope used before authentication (imported by app and mocks). */
export const GUEST_SCOPE: UserScope = 'guest'

/**
 * Catalog query parameters. The same object drives the URL, the REST request
 * and the cache key, so a filter combination can never leak into another.
 */
export interface NftListParams {
  q: string
  categories: string[]
  networks: string[]
  minPrice: string | null
  maxPrice: string | null
  sort: string
  page: number
  pageSize: number
}

export const queryKeys = {
  session: () => ['session'] as const,

  nfts: {
    all: () => ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
    related: (collection: string) => ['nfts', 'related', collection] as const,
  },

  favorites: {
    all: () => ['favorites'] as const,
    byUser: (scope: UserScope) => ['favorites', scope] as const,
  },

  cart: {
    all: () => ['cart'] as const,
    byScope: (scope: UserScope) => ['cart', scope] as const,
  },

  quote: {
    byCart: (scope: UserScope, fingerprint: string) =>
      ['quote', scope, fingerprint] as const,
  },

  orders: {
    all: () => ['orders'] as const,
    list: (scope: UserScope) => ['orders', scope] as const,
    detail: (scope: UserScope, orderId: string) => ['orders', scope, orderId] as const,
  },

  profile: {
    byUser: (scope: UserScope) => ['profile', scope] as const,
  },

  wallets: {
    byUser: (scope: UserScope) => ['wallets', scope] as const,
  },
} as const
