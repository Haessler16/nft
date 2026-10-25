import type {
  CouponValidation,
  QuoteAlert,
  QuoteLine,
} from '@/features/cart/api/contracts'
import { NETWORK_FEE_PER_UNIT } from '@/features/cart/api/contracts'
import type { ApiErrorCode } from '@/lib/api/errors'
import { multiplyEth, percentOf, subtractEth, sumEth } from '@/lib/money'
import { db } from '@/mocks/db'
import { findCoupon, isExpired, normalizeCoupon } from '@/mocks/fixtures/coupons'

/**
 * The one pricing routine of the mock (docs/PLAN.md → Seções 7 e 8).
 *
 * `GET /api/quote` (cart/checkout summary) and `POST /api/orders` (the order
 * snapshot) both call this, so revalidating at checkout can never disagree with
 * what the user was looking at: same catalog, same coupon rules, same fee.
 *
 * Money is computed with the Decimal helpers on API strings; nothing here ever
 * produces a JS number for a price.
 */

export interface PricedItem {
  nftId: string
  quantity: number
}

export interface PricedQuote {
  lines: QuoteLine[]
  count: number
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: CouponValidation | null
  alerts: QuoteAlert[]
}

export interface PricingError {
  status: number
  code: ApiErrorCode
  message: string
  fields?: Record<string, string>
}

export type PricingResult =
  | { ok: true; quote: PricedQuote }
  | { ok: false; error: PricingError }

export const priceItems = (
  items: readonly PricedItem[],
  couponCode: string | null | undefined,
): PricingResult => {
  // A coupon only reaches the URL after `POST /api/coupons/validate`, so a
  // rejection here means it expired (or the address was edited by hand).
  const code = normalizeCoupon(couponCode ?? '')
  let coupon: CouponValidation | null = null
  if (code) {
    const record = findCoupon(code)
    if (!record) {
      return {
        ok: false,
        error: {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Cupom inválido.',
          fields: { coupon: 'Cupom inválido.' },
        },
      }
    }
    if (isExpired(record)) {
      return {
        ok: false,
        error: {
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Cupom expirado.',
          fields: { coupon: 'Cupom expirado.' },
        },
      }
    }
    coupon = {
      code: record.code,
      percent: record.percent,
      description: record.description,
    }
  }

  const alerts: QuoteAlert[] = []
  if (db.scenario === 'price-changed') alerts.push('price-changed')

  const lines: QuoteLine[] = []
  for (const item of items) {
    const nft = db.nfts.find((candidate) => candidate.id === item.nftId)
    if (!nft) {
      return {
        ok: false,
        error: {
          status: 404,
          code: 'NOT_FOUND',
          message: 'NFT não encontrado.',
        },
      }
    }
    if (item.quantity > nft.available) alerts.push('availability-changed')
    lines.push({
      nftId: nft.id,
      quantity: item.quantity,
      unitPrice: nft.priceEth,
      lineTotal: multiplyEth(nft.priceEth, item.quantity),
      available: nft.available,
    })
  }

  const count = items.reduce((total, item) => total + item.quantity, 0)
  const subtotal = sumEth(lines.map((line) => line.lineTotal))
  const discount = coupon ? percentOf(subtotal, Number(coupon.percent)) : '0'
  const networkFee = multiplyEth(NETWORK_FEE_PER_UNIT, count)
  const total = subtractEth(sumEth([subtotal, networkFee]), discount)

  return {
    ok: true,
    quote: {
      lines,
      count,
      subtotal,
      discount,
      networkFee,
      total,
      coupon,
      alerts: alerts.filter((alert, index) => alerts.indexOf(alert) === index),
    },
  }
}

/** True when two decimal strings mean the same amount (`'2.5'` vs `'2.50'`). */
export const sameAmount = (a: string, b: string): boolean =>
  subtractEth(a, b) === '0'
