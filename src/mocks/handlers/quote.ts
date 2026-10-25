import { http, HttpResponse } from 'msw'

import type {
  CouponValidation,
  QuoteAlert,
  QuoteLine,
  QuoteResponse,
} from '@/features/cart/api/contracts'
import { NETWORK_FEE_PER_UNIT } from '@/features/cart/api/contracts'
import { multiplyEth, percentOf, subtractEth, sumEth } from '@/lib/money'
import { db } from '@/mocks/db'
import { findCoupon, isExpired, normalizeCoupon } from '@/mocks/fixtures/coupons'
import { errorEnvelope } from '@/mocks/handlers/envelope'

/**
 * Quote and coupon handlers (docs/PLAN.md → Seção 7).
 *
 * `GET /api/quote?items=nft_001:2,nft_004:1&coupon=KURIO10` is the **only**
 * source of money on the cart/checkout screens: it prices the requested lines
 * against the current catalog (so a `price-changed` scenario shows up in the
 * totals), applies a validated coupon and adds the simulated network fee.
 *
 * Items travel explicitly rather than being read from the server cart, because
 * Seção 8 revalidates the very same snapshot before creating an order.
 *
 * Every answer is computed with `decimal.js` helpers on strings — no float ever
 * touches a price.
 */

interface ParsedItem {
  nftId: string
  quantity: number
}

/** `items=nft_001:2,nft_004:1` → entries, or `null` when malformed/empty. */
const parseItems = (raw: string | null): ParsedItem[] | null => {
  if (!raw?.trim()) return null
  const items: ParsedItem[] = []
  for (const pair of raw.split(',')) {
    const [nftId, quantityRaw] = pair.split(':')
    const quantity = Number(quantityRaw)
    if (!nftId || !Number.isInteger(quantity) || quantity < 1) return null
    items.push({ nftId, quantity })
  }
  return items.length > 0 ? items : null
}

const couponError = (message: string) =>
  errorEnvelope(422, 'VALIDATION_ERROR', message, { coupon: message })

const quoteHandler = http.get('/api/quote', ({ request }) => {
  const url = new URL(request.url)
  const items = parseItems(url.searchParams.get('items'))
  if (!items) {
    return errorEnvelope(422, 'VALIDATION_ERROR', 'Informe os itens para cotar.', {
      items: 'Informe ao menos um item.',
    })
  }

  // A coupon only reaches the URL after `POST /api/coupons/validate`, so a
  // rejection here means the address was edited by hand: point at the field
  // instead of breaking the whole screen with a generic failure.
  const code = normalizeCoupon(url.searchParams.get('coupon') ?? '')
  let coupon: CouponValidation | null = null
  if (code) {
    const record = findCoupon(code)
    if (!record) return couponError('Cupom inválido.')
    if (isExpired(record)) return couponError('Cupom expirado.')
    coupon = { code: record.code, percent: record.percent, description: record.description }
  }

  const alerts: QuoteAlert[] = []
  if (db.scenario === 'price-changed') alerts.push('price-changed')

  const lines: QuoteLine[] = []
  for (const item of items) {
    const nft = db.nfts.find((candidate) => candidate.id === item.nftId)
    if (!nft) {
      return errorEnvelope(404, 'NOT_FOUND', 'NFT não encontrado.')
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

  const body: QuoteResponse = {
    lines,
    count,
    subtotal,
    discount,
    networkFee,
    total,
    coupon,
    alerts: alerts.filter((alert, index) => alerts.indexOf(alert) === index),
  }
  return HttpResponse.json(body)
})

/**
 * Coupon validation is its own call so "Aplicar" can fail on the field before
 * anything is written to the URL — an invalid code never replaces a summary
 * that was already correct.
 */
const validateCouponHandler = http.post('/api/coupons/validate', async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null
  const code = normalizeCoupon(typeof body?.code === 'string' ? body.code : '')
  if (!code) return couponError('Cupom obrigatório.')

  const record = findCoupon(code)
  if (!record) return couponError('Cupom inválido.')
  if (isExpired(record)) return couponError('Cupom expirado.')

  const validation: CouponValidation = {
    code: record.code,
    percent: record.percent,
    description: record.description,
  }
  return HttpResponse.json(validation)
})

export const quoteHandlers = [quoteHandler, validateCouponHandler]
