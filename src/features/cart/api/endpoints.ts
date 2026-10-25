import type {
  CouponValidation,
  QuoteResponse,
  CartResponse,
  CartEntry,
} from '@/features/cart/api/contracts'
import { http } from '@/lib/api/client'

/**
 * Cart endpoints (docs/PLAN.md → Seções 6 e 7).
 *
 * The cart carries item + quantity only; prices are never part of this
 * contract — they come from the quote endpoint. Every mutation answers with the
 * full cart, which is exactly the shape the cache holds, so a success can be
 * written straight into the cache without a refetch.
 *
 * Adding more units than the edition has left answers 409 CONFLICT with a
 * human-readable message (the handler owns the availability rule).
 */

export const fetchCart = async (signal?: AbortSignal): Promise<CartResponse> => {
  const { data } = await http.get<CartResponse>('/cart', { signal })
  return data
}

export const addToCart = async (nftId: string, quantity: number): Promise<CartResponse> => {
  const { data } = await http.post<CartResponse>('/cart/items', { nftId, quantity })
  return data
}

export const updateCartItem = async (
  nftId: string,
  quantity: number,
): Promise<CartResponse> => {
  const { data } = await http.patch<CartResponse>(
    `/cart/items/${encodeURIComponent(nftId)}`,
    { quantity },
  )
  return data
}

export const removeCartItem = async (nftId: string): Promise<CartResponse> => {
  const { data } = await http.delete<CartResponse>(
    `/cart/items/${encodeURIComponent(nftId)}`,
  )
  return data
}

/**
 * Prices a snapshot of the cart (docs/PLAN.md → Seção 7).
 *
 * The items travel explicitly — not as "the server cart" — because Seção 8
 * revalidates this exact snapshot before creating an order, and a hand-edited
 * `?coupon=` answers 422 with the field that is wrong.
 */
export const fetchQuote = async (
  items: readonly CartEntry[],
  coupon: string | undefined,
  signal?: AbortSignal,
): Promise<QuoteResponse> => {
  const params = new URLSearchParams()
  params.set('items', items.map((item) => `${item.nftId}:${item.quantity}`).join(','))
  if (coupon) params.set('coupon', coupon)
  const { data } = await http.get<QuoteResponse>(`/quote?${params.toString()}`, { signal })
  return data
}

/** Confirms a code before it reaches the URL: invalid never replaces a good summary. */
export const validateCoupon = async (code: string): Promise<CouponValidation> => {
  const { data } = await http.post<CouponValidation>('/coupons/validate', { code })
  return data
}
