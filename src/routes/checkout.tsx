import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireSession } from '@/app/guards'
import { CheckoutScreen } from '@/features/checkout/components/checkout-screen'

/**
 * `/checkout` (docs/PLAN.md → Seção 8).
 *
 * Private flow: the guard sends an expired session to `/login` carrying this
 * URL (including the applied coupon), so the purchase resumes exactly where it
 * stopped. The coupon lives in the search for the same reason as in `/cart`:
 * a refresh or a shared link must reproduce the same quote.
 */
const checkoutSearchSchema = z.object({
  coupon: z.string().trim().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/checkout')({
  validateSearch: checkoutSearchSchema,
  beforeLoad: requireSession,
  head: () => ({
    meta: [{ title: 'Pagamento — KURIO' }],
  }),
  component: CheckoutRoute,
})

function CheckoutRoute() {
  const { coupon } = Route.useSearch()
  return <CheckoutScreen coupon={coupon} />
}
