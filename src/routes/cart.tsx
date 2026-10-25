import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CartScreen } from '@/features/cart/components/cart-screen'

/**
 * `/cart` (docs/PLAN.md → Seção 7).
 *
 * The applied coupon lives in the search — `?coupon=KURIO10` — so a refresh,
 * a back button or a shared link all reproduce the same quote. The route
 * accepts only what the API confirmed (`POST /api/coupons/validate`); a junk
 * value edited by hand degrades to "no coupon" instead of crashing the screen,
 * while a code that was valid and expired later still reaches the quote, which
 * answers 422 and points at the field.
 */
const cartSearchSchema = z.object({
  coupon: z.string().trim().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/cart')({
  validateSearch: cartSearchSchema,
  head: () => ({
    meta: [{ title: 'Carrinho — KURIO' }],
  }),
  component: CartRoute,
})

function CartRoute() {
  const { coupon } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <CartScreen
      coupon={coupon}
      onApplyCoupon={(code) =>
        void navigate({
          to: '/cart',
          search: (previous) => ({ ...previous, coupon: code }),
        })
      }
      onRemoveCoupon={() =>
        void navigate({
          to: '/cart',
          search: (previous) => ({ ...previous, coupon: undefined }),
        })
      }
    />
  )
}
