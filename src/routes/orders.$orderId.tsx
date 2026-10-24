import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/orders/$orderId')({
  head: () => ({
    meta: [{ title: 'Pedido — NFT Market' }],
  }),
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()

  return (
    <RoutePlaceholder
      title="Confirmação de pedido"
      path={`/orders/${orderId}`}
      section="docs/PLAN.md → Seção 9"
      requirements={[
        'Resultado do pedido (pendente, confirmado, recusado) e identificação da transação',
        'Itens, taxas e total a partir do snapshot imutável do pedido',
        'Recuperação do estado após refresh ou reconexão, sem criar outra compra',
        'order.updated atualizando a tela até o estado terminal',
        'Pedido de outro usuário não é acessível',
      ]}
    />
  )
}
