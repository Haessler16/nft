import { createFileRoute } from '@tanstack/react-router'

import { requireSession } from '@/app/guards'
import { useSession } from '@/app/session/hooks'
import { OrdersHistoryScreen } from '@/features/orders/components/orders-history-screen'

/** `/account/orders` (docs/PLAN.md → Seção 9) — private order history. */
export const Route = createFileRoute('/account/orders')({
  beforeLoad: requireSession,
  head: () => ({ meta: [{ title: 'Meus pedidos — KURIO' }] }),
  component: OrdersRoute,
})

function OrdersRoute() {
  const { scope } = useSession()

  return <OrdersHistoryScreen scope={scope} />
}
