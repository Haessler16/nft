import type { CartEntry } from '@/features/cart/api/contracts'

/**
 * Stable identity of a cart's pricing inputs (docs/PLAN.md → Seção 7).
 *
 * The quote cache key is `['quote', scope, fingerprint]`, so two carts with the
 * same items and coupon share one entry, while a quantity bump, an added piece
 * or a new coupon produce a different key — the fresh quote is fetched without
 * invalidating anything, and the previous answer stays usable while it loads.
 *
 * The item order is sorted out, because adding piece A then B must not refetch
 * what "B then A" already answered.
 */
export const cartFingerprint = (
  items: readonly CartEntry[],
  coupon?: string,
): string => {
  const itemsPart = [...items]
    .sort((a, b) => a.nftId.localeCompare(b.nftId))
    .map((item) => `${item.nftId}x${item.quantity}`)
    .join(',')
  return coupon ? `${itemsPart}!${coupon.toUpperCase()}` : itemsPart
}
