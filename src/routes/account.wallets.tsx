import { createFileRoute } from '@tanstack/react-router'

import { RoutePlaceholder } from '@/components/feedback/route-placeholder'

export const Route = createFileRoute('/account/wallets')({
  head: () => ({
    meta: [{ title: 'Carteiras — NFT Market' }],
  }),
  component: WalletsRoute,
})

function WalletsRoute() {
  return (
    <RoutePlaceholder
      title="Carteiras"
      path="/account/wallets"
      section="docs/PLAN.md → Seção 11"
      requirements={[
        'Carteira principal e secundária com cadastro e edição',
        'Validação de endereço e rede, incluindo erros retornados pela API',
        'Carteiras cadastradas ficam disponíveis na seleção do checkout',
        'Edição confirmada permanece após refresh',
      ]}
    />
  )
}
