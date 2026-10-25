import { useQuery } from '@tanstack/react-query'

import { useSession } from '@/app/session/hooks'
import type { CartEntry } from '@/features/cart/api/contracts'
import { useCartMutations } from '@/features/cart/api/mutations'
import { cartQueryOptions, quoteQueryOptions } from '@/features/cart/api/queries'

/**
 * Session-aware cart access (docs/PLAN.md → Seção 7).
 *
 * The scope comes from the session, so the very same hook answers the visitor
 * cart (`guest`, merged into the account on login) and the signed-in cart, and
 * every screen (header badge, cart, detail) reads one shared cache entry.
 *
 * The query waits for the session to settle: asking for `guest` while the
 * session is still resolving would fetch the wrong cart and fetch again.
 */
export const useCart = () => {
  const { scope, isLoading } = useSession()
  const query = useQuery(cartQueryOptions(scope, !isLoading))
  const mutations = useCartMutations(scope)

  return {
    scope,
    query,
    ...mutations,
    /** Total units, or 0 while loading/empty — drives the header badge. */
    count: query.data?.count ?? 0,
    items: query.data?.items ?? [],
  }
}

/**
 * Header badge: same cache entry as the cart screen, so adding a piece in the
 * detail updates the badge in the same commit without a second request.
 */
export const useCartCount = (): number => useCart().count

/**
 * Money for a snapshot of the cart. Disabled while the cart is empty or the
 * session is resolving, so a visitor never asks for a quote of nothing.
 */
export const useQuote = (items: readonly CartEntry[], coupon: string | undefined) => {
  const { scope, isLoading } = useSession()
  return useQuery(quoteQueryOptions(scope, items, coupon, !isLoading && items.length > 0))
}
