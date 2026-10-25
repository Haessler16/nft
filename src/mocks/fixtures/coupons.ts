import type { CouponValidation } from '@/features/cart/api/contracts'

/**
 * Coupon fixtures (docs/PLAN.md → Seção 7).
 *
 * Deterministic and ASCII-only, so codes survive URLs, E2E assertions and
 * hand-typed demos alike. `expiredAt` in the past makes `BLACKFRIDAY` answer
 * "Cupom expirado." — distinct from an unknown code, which is "Cupom inválido.",
 * because the two messages send the user to different fixes.
 */
interface CouponRecord extends CouponValidation {
  /** `null` means the coupon never expires. */
  expiredAt: string | null
}

export const COUPONS: readonly CouponRecord[] = [
  {
    code: 'KURIO10',
    percent: '10',
    description: '10% de desconto na coleção KURIO Editions.',
    expiredAt: null,
  },
  {
    code: 'PREVENDA20',
    percent: '20',
    description: '20% para quem entrou na pré-venda.',
    expiredAt: null,
  },
  {
    code: 'BLACKFRIDAY',
    percent: '25',
    description: 'Campanha de fim de ano.',
    expiredAt: '2025-11-30T23:59:59.000Z',
  },
]

/** Codes are case-insensitive: the URL stores exactly what the user typed. */
export const normalizeCoupon = (code: string): string => code.trim().toUpperCase()

export const findCoupon = (code: string): CouponRecord | undefined =>
  COUPONS.find((coupon) => coupon.code === normalizeCoupon(code))

export const isExpired = (coupon: CouponRecord, now = Date.now()): boolean =>
  coupon.expiredAt !== null && Date.parse(coupon.expiredAt) < now
