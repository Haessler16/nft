import { queryOptions } from '@tanstack/react-query'

import type { CartEntry } from '@/features/cart/api/contracts'
import { fetchCart, fetchQuote } from '@/features/cart/api/endpoints'
import { cartFingerprint } from '@/features/cart/fingerprint'
import { queryKeys, type UserScope } from '@/lib/query/keys'

/**
 * Cart and quote queries (docs/PLAN.md → Seção 7).
 *
 * Both wait for the session to settle (`enabled` receives `!isLoading`): before
 * that the scope is still `guest`, and fetching under the wrong key would paint
 * the visitor's cart for a signed-in user (or refetch twice on a cold load).
 */
export const cartQueryOptions = (scope: UserScope, enabled = true) =>
  queryOptions({
    queryKey: queryKeys.cart.byScope(scope),
    queryFn: ({ signal }) => fetchCart(signal),
    enabled,
    staleTime: 30_000,
  })

/**
 * The quote key includes the fingerprint of items + coupon, so changing a
 * quantity or applying a code produces a *new* entry (a fresh fetch) instead of
 * invalidating the current one — the old totals stay on screen until the new
 * ones arrive, and there is no flicker to "loading".
 */
export const quoteQueryOptions = (
  scope: UserScope,
  items: readonly CartEntry[],
  coupon: string | undefined,
  enabled = items.length > 0,
) =>
  queryOptions({
    queryKey: queryKeys.quote.byCart(scope, cartFingerprint(items, coupon)),
    queryFn: ({ signal }) => fetchQuote(items, coupon, signal),
    enabled,
    staleTime: 30_000,
  })
