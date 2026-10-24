import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/checkout')({
  head: () => ({
    meta: [{ title: 'Pagamento — NFT Market' }],
  }),
  component: CheckoutRoute,
})

function CheckoutRoute() {
  return (
    <RoutePlaceholder
      title="Pagamento"
      path="/checkout"
      section="docs/PLAN.md → Seção 8"
      requirements={[
        'Rota privada: exige sessão, com retorno ao fluxo após autenticar',
        'Dados do colecionador validados, com erros de campo associados',
        'Seleção de carteira cadastrada e rede, com conexão, recusa e desconexão simuladas',
        'Revisão do pedido e revalidação de preço, disponibilidade, cupom e taxas',
        'Criação idempotente do pedido: cliques repetidos e timeout não duplicam a compra',
      ]}
    />
  )
}
