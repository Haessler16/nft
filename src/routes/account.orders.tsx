import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/account/orders')({
  head: () => ({
    meta: [{ title: 'Meus pedidos — NFT Market' }],
  }),
  component: OrdersRoute,
})

function OrdersRoute() {
  return (
    <RoutePlaceholder
      title="Meus pedidos"
      path="/account/orders"
      section="docs/PLAN.md → Seção 9"
      requirements={[
        'Lista dos pedidos do usuário autenticado, com estado e total',
        'Acesso ao recibo de cada pedido',
        'Estados de carregamento, vazio e erro com retry',
        'Atualização por order.updated sem duplicar pedidos na lista',
      ]}
    />
  )
}
