import type { EthAmount, Quantity } from '@/lib/api/types'

/**
 * Cart and quote contracts (docs/PLAN.md → Seção 7).
 *
 * The split is deliberate:
 *
 * - the cart stores **ownership intent only** (`nftId` + `quantity`). `GET
 *   /api/cart` returns that entry enriched with what a row needs to render
 *   (name, artwork, edition, availability) — but never a price;
 * - every number the user reads as money — unit price, line total, subtotal,
 *   discount, network fee and total — comes from `GET /api/quote`, so no
 *   screen can invent a value the API did not confirm.
 *
 * Prices are decimal strings end to end; quantities are integers.
 */

/** What the cart stores (and what a mutation sends). */
export interface CartEntry {
  nftId: string
  quantity: Quantity
}

/** One row of `GET /api/cart`: the entry plus its display data. */
export interface CartItem extends CartEntry {
  name: string
  imageUrl: string
  edition: { number: number; of: number }
  /** Units still purchasable — caps the quantity stepper on the screen. */
  available: Quantity
}

export interface CartResponse {
  items: CartItem[]
  /** Total units across all items — drives the header badge. */
  count: number
}

/** Simulated network fee charged per unit in the quote (mock economics). */
export const NETWORK_FEE_PER_UNIT: EthAmount = '0.0005'

/** A quoted line: money only, joined to the cart row by `nftId`. */
export interface QuoteLine {
  nftId: string
  quantity: Quantity
  unitPrice: EthAmount
  lineTotal: EthAmount
  /** Availability at quoting time; lower than `quantity` means it changed. */
  available: Quantity
}

/**
 * Server-driven warnings. They are data, not UI: the screen decides how to
 * present them, and both can be produced by a deterministic scenario.
 */
export type QuoteAlert = 'price-changed' | 'availability-changed'

export interface AppliedCoupon {
  code: string
  /** Whole percent taken off the subtotal, as a decimal string (`"10"`). */
  percent: string
}

/** Answer of `POST /api/coupons/validate` — the UI applies only confirmed codes. */
export interface CouponValidation extends AppliedCoupon {
  description: string
}

export interface QuoteResponse {
  lines: QuoteLine[]
  /** Units across all lines — mirrors the cart count at quoting time. */
  count: number
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
  coupon: AppliedCoupon | null
  alerts: QuoteAlert[]
}
