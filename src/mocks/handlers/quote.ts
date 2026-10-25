import { http, HttpResponse } from 'msw'

import type {
  CouponValidation,
  QuoteResponse,
} from '@/features/cart/api/contracts'
import { findCoupon, isExpired, normalizeCoupon } from '@/mocks/fixtures/coupons'
import { errorEnvelope } from '@/mocks/handlers/envelope'
import { priceItems } from '@/mocks/pricing'

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

  // The exact same pricing routine the order handler revalidates with, so the
  // summary the user reviewed and the snapshot that gets charged agree.
  const result = priceItems(items, url.searchParams.get('coupon'))
  if (!result.ok) {
    const { status, code, message, fields } = result.error
    return errorEnvelope(status, code, message, fields)
  }

  const body: QuoteResponse = result.quote
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
