import { createFileRoute } from '@tanstack/react-router'

import { requireSession } from '@/app/guards'
import { useSession } from '@/app/session/hooks'
import { OrderReceiptScreen } from '@/features/orders/components/order-receipt-screen'

/**
 * `/orders/:orderId` (docs/PLAN.md → Seção 9).
 *
 * Private: `requireSession` sends an unauthenticated visitor to `/login` with
 * this receipt as the return destination, and the API answers 404 for another
 * collector's order — the screen shows a single "not found" for both cases, so
 * a foreign id never reveals anything about it.
 */
export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: requireSession,
  head: () => ({ meta: [{ title: 'Confirmação de pedido — KURIO' }] }),
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  const { scope } = useSession()

  return <OrderReceiptScreen orderId={orderId} scope={scope} />
}
